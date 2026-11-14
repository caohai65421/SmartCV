const getSavedJobsStorageKey = (userId?: string | null) =>
  userId ? `smartcv_saved_job_ids_${userId}` : null;

export const getSavedJobIds = (userId?: string | null): string[] => {
  const key = getSavedJobsStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const toggleSavedJobId = (jobId: string, userId?: string | null): string[] => {
  const key = getSavedJobsStorageKey(userId);
  if (!key) return [];
  const current = getSavedJobIds(userId);
  const exists = current.includes(jobId);
  const next = exists ? current.filter((id) => id !== jobId) : [jobId, ...current];
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('cvconnect:saved_jobs_changed'));
  return next;
};
