import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  MessageSquare,
  FileText,
  ClipboardCheck,
  Copy,
  Check,
  Calendar,
  Clock,
  Building2,
  Star,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  ArrowLeft,
  Volume2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatWindow from '../components/ChatWindow';
import CVFullSheetView from '../components/CVFullSheetView';

interface PeerParticipant {
  socketId: string;
  userId: string;
  fullName: string;
  role: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const QUICK_EVAL_TAGS = [
  'Kiến thức chuyên môn vững',
  'Tư duy giải quyết vấn đề tốt',
  'Giao tiếp rõ ràng, tự tin',
  'Thái độ cầu thị, phù hợp văn hóa',
  'Tiếng Anh / Ngoại ngữ tốt',
  'Cần làm thêm bài test kỹ thuật',
];

const OnlineInterviewRoomPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [appData, setAppData] = useState<any>(null);
  const [viewerRole, setViewerRole] = useState<'CANDIDATE' | 'RECRUITER' | 'ADMIN'>('CANDIDATE');

  // Trạng thái thiết bị truyền thông cục bộ
  const [joinedCall, setJoinedCall] = useState(false);
  const [joiningMedia, setJoiningMedia] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaNotice, setMediaNotice] = useState('');

  // Trạng thái đối phương trong phòng
  const [remotePeer, setRemotePeer] = useState<PeerParticipant | null>(null);
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bảng công cụ bên phải: Hồ sơ CV | Trò chuyện | Đánh giá phỏng vấn (chỉ NTD)
  const [sideTab, setSideTab] = useState<'chat' | 'cv' | 'eval'>('cv');
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Đánh giá & ghi chú bảo mật dành riêng cho Nhà tuyển dụng
  const [evalRating, setEvalRating] = useState<number>(0);
  const [evalNotes, setEvalNotes] = useState<string>('');
  const [savingEval, setSavingEval] = useState(false);
  const [evalSavedMsg, setEvalSavedMsg] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Refs cho WebRTC & MediaStreams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  // Refs đồng bộ trạng thái media hiện tại cho socket callbacks
  const mediaStateRef = useRef({ micOn: true, camOn: true, screenSharing: false });
  useEffect(() => {
    mediaStateRef.current = { micOn, camOn, screenSharing };
  }, [micOn, camOn, screenSharing]);

  // 1. Tải thông tin phòng phỏng vấn & kiểm tra quyền truy cập
  useEffect(() => {
    if (!applicationId) return;
    const fetchRoom = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await api.get(`/applications/${applicationId}/interview-room`);
        const fetchedApp = res.data?.application;
        const role = res.data?.viewerRole || 'CANDIDATE';
        setAppData(fetchedApp);
        setViewerRole(role);
        if (role === 'RECRUITER') {
          setSideTab('eval');
          if (fetchedApp?.interviewEvaluation) {
            setEvalRating(Number(fetchedApp.interviewEvaluation.rating || 0));
            setEvalNotes(fetchedApp.interviewEvaluation.notes || '');
          }
        } else {
          setSideTab('chat');
        }
      } catch (err: any) {
        setErrorMsg(
          err.response?.data?.message ||
            'Không thể truy cập phòng phỏng vấn trực tuyến này.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [applicationId]);

  // Bộ đếm thời lượng cuộc phỏng vấn khi cả 2 bên cùng có mặt
  useEffect(() => {
    if (!joinedCall || !remotePeer) return;
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [joinedCall, remotePeer]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Gán stream vào thẻ video an toàn
  const attachLocalPreview = useCallback((stream: MediaStream | null) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  const attachRemotePreview = useCallback((stream: MediaStream | null) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  // Đóng kết nối WebRTC hiện tại với đối phương
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    videoSenderRef.current = null;
    audioSenderRef.current = null;
    remoteSocketIdRef.current = null;
    pendingIceRef.current = [];
    remoteStreamRef.current = null;
    setHasRemoteVideoTrack(false);
    attachRemotePreview(null);
  }, [attachRemotePreview]);

  // Dọn dẹp toàn bộ camera/mic/screen khi rời trang
  const cleanupAllMedia = useCallback(() => {
    closePeerConnection();
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    attachLocalPreview(null);
  }, [closePeerConnection, attachLocalPreview]);

  useEffect(() => {
    return () => {
      if (socket && applicationId) {
        socket.emit('leave_interview_room', { applicationId });
      }
      cleanupAllMedia();
    };
  }, [socket, applicationId, cleanupAllMedia]);

  // Đảm bảo thẻ video luôn gắn đúng stream khi giao diện render lại
  useEffect(() => {
    if (!joinedCall) return;
    const activeLocal = screenSharing && screenStreamRef.current
      ? screenStreamRef.current
      : localStreamRef.current;
    attachLocalPreview(activeLocal);
    if (remoteStreamRef.current) {
      attachRemotePreview(remoteStreamRef.current);
    }
  }, [joinedCall, screenSharing, camOn, remotePeer, hasRemoteVideoTrack, attachLocalPreview, attachRemotePreview]);

  // Khởi tạo RTCPeerConnection tới targetSocketId
  const createPeerConnection = useCallback(
    (targetSocketId: string) => {
      closePeerConnection();
      remoteSocketIdRef.current = targetSocketId;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      const inboundStream = new MediaStream();
      remoteStreamRef.current = inboundStream;

      // Luôn đảm bảo có cả kênh Audio & Video (sendrecv) để dù ban đầu không bật cam vẫn chia sẻ màn hình mượt mà
      const localStream = localStreamRef.current;
      const audioTrack = localStream?.getAudioTracks()[0] || null;
      const activeVideoTrack =
        screenStreamRef.current?.getVideoTracks()[0] ||
        localStream?.getVideoTracks()[0] ||
        null;

      if (audioTrack && localStream) {
        audioSenderRef.current = pc.addTrack(audioTrack, localStream);
      } else {
        const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        audioSenderRef.current = audioTransceiver.sender;
      }

      if (activeVideoTrack) {
        const containerStream = screenStreamRef.current || localStream || new MediaStream([activeVideoTrack]);
        videoSenderRef.current = pc.addTrack(activeVideoTrack, containerStream);
      } else {
        const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
        videoSenderRef.current = videoTransceiver.sender;
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!inboundStream.getTracks().some((t) => t.id === track.id)) {
              inboundStream.addTrack(track);
            }
          });
        } else if (event.track) {
          if (!inboundStream.getTracks().some((t) => t.id === event.track.id)) {
            inboundStream.addTrack(event.track);
          }
        }
        if (inboundStream.getVideoTracks().length > 0) {
          setHasRemoteVideoTrack(true);
        }
        attachRemotePreview(inboundStream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && applicationId) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId,
            applicationId,
            candidate: event.candidate,
          });
        }
      };

      return pc;
    },
    [applicationId, attachRemotePreview, closePeerConnection, socket]
  );

  // Yêu cầu quyền Camera / Micro với cơ chế tự động hạ cấp mượt mà (2 tab trên 1 laptop vẫn hoạt động 100%)
  const startAndJoinRoom = async () => {
    if (!applicationId) return;
    setJoiningMedia(true);
    setMediaNotice('');

    let stream: MediaStream | null = null;
    let initialMic = false;
    let initialCam = false;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        initialMic = stream.getAudioTracks().length > 0;
        initialCam = stream.getVideoTracks().length > 0;
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          initialMic = stream.getAudioTracks().length > 0;
          initialCam = false;
          setMediaNotice(
            'Camera đang bận hoặc chưa được cấp quyền — Đã vào phòng ở chế độ Âm thanh (bạn vẫn có thể Chia sẻ màn hình).'
          );
        } catch {
          stream = new MediaStream();
          initialMic = false;
          initialCam = false;
          setMediaNotice(
            'Không tìm thấy Camera/Micro khả dụng — Bạn vẫn có thể theo dõi hình ảnh đối phương, Chia sẻ màn hình và Chat trực tiếp.'
          );
        }
      }
    } else {
      stream = new MediaStream();
      setMediaNotice(
        'Trình duyệt chưa hỗ trợ truy cập Camera trực tiếp — Đã kết nối phòng ở chế độ Xem CV & Chat trực tuyến.'
      );
    }

    localStreamRef.current = stream;
    setMicOn(initialMic);
    setCamOn(initialCam);
    setJoinedCall(true);
    setJoiningMedia(false);
    attachLocalPreview(stream);

    if (socket && connected) {
      socket.emit('join_interview_room', {
        applicationId,
        micOn: initialMic,
        camOn: initialCam,
        screenSharing: false,
      });
    }
  };

  // Lắng nghe tín hiệu WebRTC & trạng thái phòng từ Socket.io
  useEffect(() => {
    if (!socket || !connected || !joinedCall || !applicationId) return;

    // Đảm bảo nếu socket tự động kết nối lại thì tự động join lại phòng phỏng vấn
    socket.emit('join_interview_room', {
      applicationId,
      micOn: mediaStateRef.current.micOn,
      camOn: mediaStateRef.current.camOn,
      screenSharing: mediaStateRef.current.screenSharing,
    });

    const flushPendingIce = async (pc: RTCPeerConnection) => {
      while (pendingIceRef.current.length > 0) {
        const cand = pendingIceRef.current.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // Bỏ qua ICE cũ nếu phiên đã đổi
          }
        }
      }
    };

    const handleRoomParticipants = async (data: {
      applicationId: string;
      participants: PeerParticipant[];
    }) => {
      if (data.applicationId !== applicationId) return;
      const peer = data.participants[0];
      if (!peer) {
        setRemotePeer(null);
        return;
      }

      setRemotePeer(peer);
      const pc = createPeerConnection(peer.socketId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
          targetSocketId: peer.socketId,
          applicationId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('Lỗi tạo WebRTC Offer:', err);
      }
    };

    const handlePeerJoined = (data: {
      applicationId: string;
      participant: PeerParticipant;
    }) => {
      if (data.applicationId !== applicationId) return;
      setRemotePeer(data.participant);
    };

    const handleWebrtcOffer = async (data: {
      fromSocketId: string;
      applicationId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (data.applicationId !== applicationId) return;
      let pc = pcRef.current;
      if (!pc || remoteSocketIdRef.current !== data.fromSocketId) {
        pc = createPeerConnection(data.fromSocketId);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', {
          targetSocketId: data.fromSocketId,
          applicationId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('Lỗi xử lý WebRTC Offer:', err);
      }
    };

    const handleWebrtcAnswer = async (data: {
      fromSocketId: string;
      applicationId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (data.applicationId !== applicationId) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushPendingIce(pc);
      } catch (err) {
        console.error('Lỗi xử lý WebRTC Answer:', err);
      }
    };

    const handleIceCandidate = async (data: {
      fromSocketId: string;
      applicationId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (data.applicationId !== applicationId || !data.candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        // Bỏ qua candidate trễ
      }
    };

    const handleMediaState = (data: {
      socketId: string;
      userId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing: boolean;
    }) => {
      setRemotePeer((prev) =>
        prev && (prev.socketId === data.socketId || prev.userId === data.userId)
          ? {
              ...prev,
              micOn: data.micOn,
              camOn: data.camOn,
              screenSharing: data.screenSharing,
            }
          : prev
      );
    };

    const handlePeerLeft = (data: { socketId: string; userId: string }) => {
      setRemotePeer((prev) => {
        if (prev && prev.socketId === data.socketId) {
          closePeerConnection();
          return null;
        }
        return prev;
      });
    };

    socket.on('interview_room_participants', handleRoomParticipants);
    socket.on('interview_peer_joined', handlePeerJoined);
    socket.on('webrtc_offer', handleWebrtcOffer);
    socket.on('webrtc_answer', handleWebrtcAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('interview_media_state', handleMediaState);
    socket.on('interview_peer_left', handlePeerLeft);

    return () => {
      socket.off('interview_room_participants', handleRoomParticipants);
      socket.off('interview_peer_joined', handlePeerJoined);
      socket.off('webrtc_offer', handleWebrtcOffer);
      socket.off('webrtc_answer', handleWebrtcAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('interview_media_state', handleMediaState);
      socket.off('interview_peer_left', handlePeerLeft);
    };
  }, [socket, connected, joinedCall, applicationId, createPeerConnection, closePeerConnection]);

  // Phát tín hiệu cập nhật trạng thái Mic / Cam / Màn hình cho đối phương
  const broadcastMediaState = (nextMic: boolean, nextCam: boolean, nextScreen: boolean) => {
    if (socket && applicationId && joinedCall) {
      socket.emit('interview_media_state', {
        applicationId,
        micOn: nextMic,
        camOn: nextCam,
        screenSharing: nextScreen,
      });
    }
  };

  // Bật / tắt Micro
  const handleToggleMic = async () => {
    const stream = localStreamRef.current;
    const audioTracks = stream?.getAudioTracks() || [];

    if (audioTracks.length > 0) {
      const next = !micOn;
      audioTracks.forEach((t) => {
        t.enabled = next;
      });
      setMicOn(next);
      broadcastMediaState(next, camOn, screenSharing);
      return;
    }

    // Nếu lúc đầu chưa lấy được Micro thì thử xin quyền lại
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const newAudioTrack = micStream.getAudioTracks()[0];
      if (newAudioTrack) {
        if (!localStreamRef.current) localStreamRef.current = new MediaStream();
        localStreamRef.current.addTrack(newAudioTrack);
        if (audioSenderRef.current) {
          await audioSenderRef.current.replaceTrack(newAudioTrack);
        }
        setMicOn(true);
        setMediaNotice('');
        broadcastMediaState(true, camOn, screenSharing);
      }
    } catch {
      setMediaNotice('Không thể bật Micro. Vui lòng kiểm tra quyền Micro trên trình duyệt.');
    }
  };

  // Bật / tắt Camera
  const handleToggleCam = async () => {
    if (screenSharing) {
      setMediaNotice('Bạn đang chia sẻ màn hình. Hãy dừng chia sẻ màn hình để chuyển về Camera.');
      return;
    }

    const stream = localStreamRef.current;
    const videoTracks = stream?.getVideoTracks() || [];

    if (videoTracks.length > 0) {
      const next = !camOn;
      videoTracks.forEach((t) => {
        t.enabled = next;
      });
      setCamOn(next);
      broadcastMediaState(micOn, next, screenSharing);
      return;
    }

    // Thử mở Camera theo yêu cầu
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newVideoTrack = camStream.getVideoTracks()[0];
      if (newVideoTrack) {
        if (!localStreamRef.current) localStreamRef.current = new MediaStream();
        localStreamRef.current.addTrack(newVideoTrack);
        if (videoSenderRef.current) {
          await videoSenderRef.current.replaceTrack(newVideoTrack);
        }
        attachLocalPreview(localStreamRef.current);
        setCamOn(true);
        setMediaNotice('');
        broadcastMediaState(micOn, true, false);
      }
    } catch {
      setMediaNotice('Không thể bật Camera (thiết bị đang được dùng bởi ứng dụng khác hoặc chưa cấp quyền).');
    }
  };

  // Chia sẻ màn hình (rất hữu ích khi ứng viên demo dự án / live coding)
  const stopScreenShareInternal = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const webcamTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    if (videoSenderRef.current) {
      try {
        await videoSenderRef.current.replaceTrack(webcamTrack && camOn ? webcamTrack : null);
      } catch {
        // ignore
      }
    }
    attachLocalPreview(localStreamRef.current);
    setScreenSharing(false);
    if (socket && applicationId) {
      socket.emit('interview_media_state', {
        applicationId,
        micOn: mediaStateRef.current.micOn,
        camOn: mediaStateRef.current.camOn,
        screenSharing: false,
      });
    }
  }, [applicationId, attachLocalPreview, camOn, socket]);

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      await stopScreenShareInternal();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaNotice('Trình duyệt hiện tại không hỗ trợ tính năng Chia sẻ màn hình.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(screenTrack);

        // Nếu kết nối đã thiết lập mà trước đó chưa có video track, gửi lại Offer để đồng bộ ngay lập tức
        if (pcRef.current && remoteSocketIdRef.current && socket && applicationId) {
          try {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            socket.emit('webrtc_offer', {
              targetSocketId: remoteSocketIdRef.current,
              applicationId,
              sdp: pcRef.current.localDescription,
            });
          } catch {
            // ignore
          }
        }
      }

      screenTrack.onended = () => {
        stopScreenShareInternal();
      };

      attachLocalPreview(displayStream);
      setScreenSharing(true);
      setMediaNotice('');
      broadcastMediaState(micOn, camOn, true);
    } catch {
      // Người dùng bấm Hủy hộp thoại chọn màn hình
    }
  };

  const handleLeaveRoom = () => {
    if (socket && applicationId) {
      socket.emit('leave_interview_room', { applicationId });
    }
    cleanupAllMedia();
    if (viewerRole === 'RECRUITER') {
      navigate('/recruiter-dashboard');
    } else if (viewerRole === 'CANDIDATE') {
      navigate('/candidate-dashboard?tab=applied-jobs');
    } else {
      navigate('/admin');
    }
  };

  const handleCopyRoomLink = () => {
    const url = `${window.location.origin}/interview-room/${applicationId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Lưu đánh giá phỏng vấn bảo mật (chỉ dành cho Nhà tuyển dụng)
  const handleSaveEvaluation = async () => {
    if (!applicationId) return;
    setSavingEval(true);
    setEvalSavedMsg('');
    try {
      await api.post(`/applications/${applicationId}/interview-evaluation`, {
        rating: evalRating,
        notes: evalNotes,
      });
      setEvalSavedMsg('Đã lưu đánh giá phỏng vấn bảo mật vào hệ thống!');
      setTimeout(() => setEvalSavedMsg(''), 3000);
    } catch (err: any) {
      setEvalSavedMsg(err.response?.data?.message || 'Lỗi khi lưu đánh giá.');
    } finally {
      setSavingEval(false);
    }
  };

  const handleQuickUpdateStatus = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!applicationId) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/applications/${applicationId}/status`, { status });
      setAppData((prev: any) => (prev ? { ...prev, status } : prev));
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 pt-20 gap-3">
        <Loader2 size={34} className="animate-spin text-teal-400" />
        <p className="text-sm font-semibold text-slate-300">
          Đang khởi tạo phòng phỏng vấn trực tuyến SmartCV...
        </p>
      </div>
    );
  }

  if (errorMsg || !appData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không thể mở phòng phỏng vấn</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMsg || 'Phòng phỏng vấn không tồn tại hoặc tài khoản của bạn không thuộc phiên phỏng vấn này.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Quay về trang chính
          </Link>
        </div>
      </div>
    );
  }

  const candidateName =
    appData.cv?.data?.fullName ||
    appData.cv?.data?.personalInfo?.fullName ||
    appData.candidate?.fullName ||
    'Ứng viên';
  const companyName = appData.job?.company?.name || 'Doanh nghiệp tuyển dụng';
  const recruiterName = appData.job?.author?.fullName || companyName;
  const partnerDisplayName =
    viewerRole === 'RECRUITER' ? candidateName : `${companyName} (${recruiterName})`;
  const partnerUserId =
    viewerRole === 'RECRUITER' ? appData.candidateId : appData.job?.postedBy || '';
  const schedule = appData.interviewSchedule;
  const isRecruiter = viewerRole === 'RECRUITER';

  const remoteShowsVideo =
    Boolean(remotePeer) &&
    hasRemoteVideoTrack &&
    (remotePeer!.camOn || remotePeer!.screenSharing);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-16 sm:pt-20 flex flex-col">
      {/* THANH TIÊU ĐỀ PHÒNG PHỎNG VẤN TRỰC TUYẾN */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate">
                Phỏng vấn Online: {appData.job?.title}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  remotePeer
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    remotePeer ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {remotePeer
                  ? `Đang kết nối trực tiếp • ${formatDuration(callSeconds)}`
                  : 'Đang chờ đối phương vào phòng'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} className="text-teal-400" /> {companyName}
              </span>
              <span>•</span>
              <span>Ứng viên: {candidateName}</span>
              {schedule && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline text-teal-300">
                    Lịch hẹn: {schedule.time} ngày {String(schedule.date || '').split('-').reverse().join('/')}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyRoomLink}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-300">Đã chép link phòng</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-teal-400" />
                <span className="hidden sm:inline">Sao chép link phòng</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSidePanel((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText size={14} className="text-sky-400" />
            <span>{showSidePanel ? 'Thu gọn bảng bên' : 'Mở CV & Chat'}</span>
          </button>
        </div>
      </div>

      {/* MÀN HÌNH SẢNH CHỜ TRƯỚC KHI BẤM THAM GIA (PRE-JOIN LOBBY) */}
      {!joinedCall ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                  <Sparkles size={13} /> Phòng phỏng vấn trực tuyến SmartCV
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {appData.job?.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Phiên làm việc trực tiếp giữa <strong>{companyName}</strong> và ứng viên{' '}
                  <strong>{candidateName}</strong>
                </p>
              </div>
            </div>

            {schedule && (
              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <Calendar size={14} className="text-teal-400 shrink-0" />
                  <span>
                    Ngày hẹn:{' '}
                    <strong className="text-white">
                      {String(schedule.date || '').split('-').reverse().join('/')}
                    </strong>
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={14} className="text-teal-400 shrink-0" />
                  <span>
                    Khung giờ: <strong className="text-white">{schedule.time}</strong>
                  </span>
                </p>
                <p className="sm:col-span-2 text-slate-400">
                  Người phụ trách: <strong className="text-slate-200">{schedule.interviewer}</strong>
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-800/50 text-xs text-teal-200/90 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-teal-300">Tiện ích tích hợp ngay trong phòng:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                <li>Gọi Video &amp; Âm thanh hai chiều trực tiếp trên trình duyệt (không cần cài phần mềm).</li>
                <li>Chia sẻ màn hình để trình bày Portfolio, đồ án hoặc live-coding.</li>
                <li>Xem đối chiếu Hồ sơ CV trực tuyến &amp; nhắn tin gửi link tài liệu theo thời gian thực.</li>
                {isRecruiter && (
                  <li>Bảng chấm điểm sao &amp; ghi chú đánh giá bảo mật lưu riêng cho Nhà tuyển dụng.</li>
                )}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Quay lại
              </button>

              <button
                type="button"
                disabled={joiningMedia}
                onClick={startAndJoinRoom}
                className="flex-1 sm:flex-initial px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-teal-900/40 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {joiningMedia ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang kết nối thiết bị...</span>
                  </>
                ) : (
                  <>
                    <Video size={18} />
                    <span>Tham gia phòng phỏng vấn ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* KHÔNG GIAN PHỎNG VẤN CHÍNH: KHUNG VIDEO + BẢNG CÔNG CỤ BÊN PHẢI */
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* CỘT TRÁI: SÂN KHẤU VIDEO CHÍNH & THANH ĐIỀU KHIỂN */}
          <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 min-h-[420px]">
            {mediaNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                <span>{mediaNotice}</span>
                <button
                  type="button"
                  onClick={() => setMediaNotice('')}
                  className="text-amber-300 hover:text-white font-bold text-xs px-1.5 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* KHUNG HÌNH ĐỐI PHƯƠNG + HÌNH BẢN THÂN (PiP) */}
            <div className="relative flex-1 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[320px]">
              {/* Video/Audio của đối phương (luôn mount thẻ video để phát cả luồng âm thanh) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full ${
                  remotePeer?.screenSharing ? 'object-contain bg-black' : 'object-cover'
                } ${remoteShowsVideo ? 'block' : 'hidden'}`}
              />

              {/* Giao diện hiển thị khi đối phương chưa vào hoặc đang tắt Camera */}
              {!remoteShowsVideo && (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl sm:text-3xl font-black text-teal-400 shadow-inner">
                    {(remotePeer?.fullName || partnerDisplayName).slice(0, 2).toUpperCase()}
                  </div>
                  {remotePeer ? (
                    <div className="space-y-1">
                      <p className="text-base sm:text-lg font-bold text-white">
                        {remotePeer.fullName}
                      </p>
                      <p className="text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                        <Volume2 size={14} /> Đang có mặt trong phòng (Camera đang tắt)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-md">
                      <p className="text-sm sm:text-base font-bold text-slate-200">
                        Đang chờ {partnerDisplayName} tham gia phòng...
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Hệ thống đã gửi thông báo tới đối phương. Bạn cũng có thể bấm{' '}
                        <strong className="text-teal-300">Sao chép link phòng</strong> hoặc nhắn trong mục Trò chuyện bên phải.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Nhãn tên & trạng thái Micro của đối phương */}
              {remotePeer && (
                <div className="absolute top-3.5 left-3.5 px-3 py-1.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs">
                  <Users size={13} className="text-teal-400" />
                  <span className="font-semibold text-white">{remotePeer.fullName}</span>
                  {remotePeer.screenSharing && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                      Đang chia sẻ màn hình
                    </span>
                  )}
                  {!remotePeer.micOn && <MicOff size={13} className="text-rose-400" />}
                </div>
              )}

              {/* Ô Video nhỏ của bản thân (Picture-in-Picture góc dưới phải) */}
              <div className="absolute bottom-3.5 right-3.5 w-36 sm:w-48 aspect-video rounded-2xl bg-slate-800 border-2 border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    camOn || screenSharing ? 'block' : 'hidden'
                  }`}
                />
                {!camOn && !screenSharing && (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center">
                      {(user?.fullName || 'Bạn').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium">Camera tắt</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-semibold text-white drop-shadow">
                  <span className="px-1.5 py-0.5 rounded bg-black/60 truncate">
                    Bạn {screenSharing ? '(Màn hình)' : ''}
                  </span>
                  {!micOn && (
                    <span className="p-1 rounded bg-rose-600/90">
                      <MicOff size={10} />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* THANH ĐIỀU KHIỂN CUỘC GỌI PHỎNG VẤN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleToggleMic}
                title={micOn ? 'Tắt Micro' : 'Bật Micro'}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  micOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                <span className="hidden sm:inline">{micOn ? 'Micro đang bật' : 'Micro tắt'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleCam}
                title={camOn ? 'Tắt Camera' : 'Bật Camera'}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  camOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                <span className="hidden sm:inline">{camOn ? 'Camera đang bật' : 'Camera tắt'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleScreenShare}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  screenSharing
                    ? 'bg-sky-600 hover:bg-sky-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {screenSharing ? <MonitorX size={16} /> : <MonitorUp size={16} />}
                <span>{screenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}</span>
              </button>

              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <PhoneOff size={16} />
                <span>Rời phòng</span>
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: HỒ SƠ CV, CHAT TRỰC TIẾP & BẢNG ĐÁNH GIÁ NHÀ TUYỂN DỤNG */}
          {showSidePanel && (
            <div className="w-full lg:w-[440px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-white text-slate-800 flex flex-col h-[540px] lg:h-[calc(100vh-8.5rem)] shrink-0">
              {/* Thanh chuyển Tab */}
              <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-3 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSideTab('chat')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    sideTab === 'chat'
                      ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare size={14} />
                  <span>Trò chuyện</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSideTab('cv')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    sideTab === 'cv'
                      ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} />
                  <span>Hồ sơ CV</span>
                </button>

                {isRecruiter ? (
                  <button
                    type="button"
                    onClick={() => setSideTab('eval')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      sideTab === 'eval'
                        ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ClipboardCheck size={14} />
                    <span>Chấm điểm PV</span>
                  </button>
                ) : (
                  <div className="py-2 px-2 rounded-xl text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
                    <Calendar size={13} className="text-teal-600" />
                    <span className="truncate">{schedule ? schedule.time : 'Phỏng vấn'}</span>
                  </div>
                )}
              </div>

              {/* NỘI DUNG TỪNG TAB */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                {sideTab === 'chat' && (
                  <div className="h-full min-h-[420px]">
                    <ChatWindow
                      fullHeight
                      compact
                      applicationId={appData.id}
                      receiverId={partnerUserId}
                      receiverName={partnerDisplayName}
                    />
                  </div>
                )}

                {sideTab === 'cv' && (
                  <div className="space-y-3">
                    {/* Nút mở file PDF tải lên nếu ứng viên có đính kèm */}
                    {(appData.uploadedPdfUrl || appData.cv?.pdfUrl) && (
                      <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-sky-900 truncate">
                            {appData.uploadedFileName || 'Tệp CV PDF đính kèm'}
                          </p>
                          <p className="text-[11px] text-sky-700">
                            Mở tệp gốc sang tab mới để xem cỡ lớn
                          </p>
                        </div>
                        <a
                          href={appData.uploadedPdfUrl || appData.cv?.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink size={13} /> Mở PDF
                        </a>
                      </div>
                    )}

                    {appData.coverLetter && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Thư giới thiệu của ứng viên
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {appData.coverLetter}
                        </p>
                      </div>
                    )}

                    {appData.cv ? (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <CVFullSheetView
                          title={appData.cv.title}
                          template={appData.cv.template}
                          data={appData.cv.data}
                          fallbackName={candidateName}
                          fallbackEmail={appData.candidate?.email}
                          pdfUrl={appData.uploadedPdfUrl || appData.cv.pdfUrl}
                          showExportToolbar={false}
                        />
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        Ứng viên nộp đơn nhanh hoặc chỉ đính kèm tệp PDF từ máy tính.
                      </div>
                    )}
                  </div>
                )}

                {sideTab === 'eval' && isRecruiter && (
                  <div className="space-y-4 p-1">
                    <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
                      <p className="text-xs font-bold text-teal-900">
                        Phiếu đánh giá phỏng vấn nội bộ (Bảo mật)
                      </p>
                      <p className="text-[11px] text-teal-700 leading-relaxed">
                        Chỉ Nhà tuyển dụng mới xem được điểm số và nhận xét chuyên môn này.
                      </p>
                    </div>

                    {/* Chấm điểm 1 - 5 sao */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Mức độ đánh giá sau phỏng vấn
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEvalRating(star)}
                            className="p-1.5 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Star
                              size={24}
                              className={
                                star <= evalRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }
                            />
                          </button>
                        ))}
                        {evalRating > 0 && (
                          <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            {evalRating}/5 sao
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nhãn gợi ý nhanh */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Chèn nhanh tiêu chí nhận xét
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_EVAL_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setEvalNotes((prev) =>
                                prev.includes(tag)
                                  ? prev
                                  : prev.trim()
                                  ? `${prev.trim()}\n• ${tag}`
                                  : `• ${tag}`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ô nhập ghi chú phỏng vấn */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Ghi chú chi tiết buổi phỏng vấn
                      </label>
                      <textarea
                        rows={6}
                        value={evalNotes}
                        onChange={(e) => setEvalNotes(e.target.value)}
                        placeholder="Ghi lại điểm mạnh, câu trả lời kỹ thuật, mức lương kỳ vọng, thời gian có thể nhận việc..."
                        className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
                      />
                    </div>

                    {evalSavedMsg && (
                      <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                        {evalSavedMsg}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={savingEval}
                      onClick={handleSaveEvaluation}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {savingEval && <Loader2 size={15} className="animate-spin" />}
                      <span>Lưu phiếu đánh giá phỏng vấn</span>
                    </button>

                    {/* Quyết định trạng thái hồ sơ ngay sau phỏng vấn */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Trạng thái hồ sơ hiện tại:</span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                            appData.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : appData.status === 'REJECTED'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {appData.status === 'ACCEPTED'
                            ? 'Đã duyệt / Đạt'
                            : appData.status === 'REJECTED'
                            ? 'Chưa phù hợp'
                            : 'Đang xét duyệt'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={updatingStatus || appData.status === 'ACCEPTED'}
                          onClick={() => handleQuickUpdateStatus('ACCEPTED')}
                          className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Chấp nhận hồ sơ
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatus || appData.status === 'REJECTED'}
                          onClick={() => handleQuickUpdateStatus('REJECTED')}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle size={14} /> Từ chối hồ sơ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnlineInterviewRoomPage;
