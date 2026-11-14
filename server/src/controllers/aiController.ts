import { Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Kiểm tra xem máy chủ có được cấu hình khóa LLM ngoài (Gemini / OpenAI) hay không.
 */
export const getAIStatus = async (_req: any, res: Response) => {
  const hasGemini = Boolean((process.env.GEMINI_API_KEY || '').trim());
  const hasOpenAI = Boolean((process.env.OPENAI_API_KEY || '').trim());
  return res.json({
    llmConfigured: hasGemini || hasOpenAI,
    provider: hasGemini ? 'gemini' : hasOpenAI ? 'openai' : 'local-rag-engine',
  });
};

/**
 * Gọi LLM ngoài (Gemini / OpenAI) nếu có API Key, truyền kèm toàn bộ dữ liệu thực tế từ PostgreSQL
 * (Tin tuyển dụng, Hồ sơ CV ứng viên, Kinh nghiệm, Học vấn, Kỹ năng, Lịch sử hội thoại) để trả lời tự nhiên & chính xác.
 */
export const chatWithAI = async (req: any, res: Response) => {
  try {
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const openAIKey = (process.env.OPENAI_API_KEY || '').trim();

    if (!geminiKey && !openAIKey) {
      return res.json({ handledByLLM: false });
    }

    const userId = req.user.userId;
    const roleName = req.user.roleName || req.user.role || 'CANDIDATE';
    const { message, history = [], activeContext = {} } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Thiếu nội dung câu hỏi.' });
    }

    let systemKnowledge = '';

    if (roleName === 'RECRUITER') {
      const [jobs, apps] = await Promise.all([
        prisma.job.findMany({
          where: { postedBy: userId },
          include: { company: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.application.findMany({
          where: { job: { postedBy: userId } },
          include: {
            candidate: { select: { id: true, fullName: true, email: true } },
            cv: true,
            job: { select: { id: true, title: true, salary: true, location: true, requirements: true } },
          },
          orderBy: { appliedDate: 'desc' },
        }),
      ]);

      const compactJobs = jobs.map((j) => ({
        id: j.id,
        title: j.title,
        salary: j.salary,
        location: j.location,
        status: j.status,
        requirements: j.requirements,
      }));

      const compactApps = apps.map((a) => {
        const d: any = a.cv?.data || {};
        return {
          applicationId: a.id,
          jobTitle: a.job?.title,
          status: a.status,
          candidateName: d.fullName || a.candidate?.fullName,
          email: d.email || a.candidate?.email,
          phone: d.phone || '',
          address: d.address || '',
          yearsOfExperience: d.yearsOfExperience,
          summary: d.summary,
          skills: d.skills,
          experience: d.experience,
          projects: d.projects,
          education: d.education,
          languages: d.languages,
          awards: d.awards,
          coverLetter: a.coverLetter,
        };
      });

      systemKnowledge =
        `Bạn là Trợ lý AI Tuyển Dụng thông minh trên nền tảng SmartCV. ` +
        `Hãy trả lời bằng tiếng Việt tự nhiên, ngắn gọn, đi thẳng vào đúng câu hỏi của Nhà tuyển dụng dựa TUYỆT ĐỐI trên dữ liệu thật dưới đây (không bịa đặt thông tin ngoài dữ liệu, giữ đúng ngữ cảnh vị trí/ứng viên đang trao đổi).\n` +
        `Ngữ cảnh hiện tại: ${JSON.stringify(activeContext)}\n` +
        `Danh sách vị trí tuyển dụng của doanh nghiệp: ${JSON.stringify(compactJobs)}\n` +
        `Danh sách hồ sơ ứng viên đã nộp: ${JSON.stringify(compactApps)}`;
    } else {
      const [jobs, cvs] = await Promise.all([
        prisma.job.findMany({
          where: { status: 'OPEN' },
          include: { company: { select: { name: true, location: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        prisma.cV.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        }),
      ]);

      systemKnowledge =
        `Bạn là Trợ lý AI Tư Vấn Việc Làm & CV trên nền tảng SmartCV. ` +
        `Hãy trả lời bằng tiếng Việt tự nhiên, đúng trọng tâm câu hỏi của Ứng viên dựa TUYỆT ĐỐI trên CV của họ và danh sách việc làm đang mở dưới đây.\n` +
        `Ngữ cảnh hiện tại: ${JSON.stringify(activeContext)}\n` +
        `CV của ứng viên: ${JSON.stringify(cvs[0] || null)}\n` +
        `Danh sách việc làm đang mở: ${JSON.stringify(
          jobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company?.name,
            salary: j.salary,
            location: j.location,
            requireCV: j.requireCV,
            description: j.description,
            requirements: j.requirements,
          }))
        )}`;
    }

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];

    if (geminiKey) {
      const contents = [
        ...recentHistory.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.text || '') }],
        })),
        { role: 'user', parts: [{ text: String(message) }] },
      ];

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemKnowledge }] },
            contents,
            generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
          }),
        }
      );

      if (resp.ok) {
        const data: any = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || '')
          .join('')
          .trim();
        if (text) {
          return res.json({ handledByLLM: true, reply: text });
        }
      }
    }

    if (openAIKey) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.25,
          messages: [
            { role: 'system', content: systemKnowledge },
            ...recentHistory.map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: String(m.text || ''),
            })),
            { role: 'user', content: String(message) },
          ],
        }),
      });

      if (resp.ok) {
        const data: any = await resp.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) {
          return res.json({ handledByLLM: true, reply: text });
        }
      }
    }

    return res.json({ handledByLLM: false });
  } catch (error) {
    console.warn('AI LLM fallback sang bộ suy luận dữ liệu nội bộ:', error);
    return res.json({ handledByLLM: false });
  }
};
