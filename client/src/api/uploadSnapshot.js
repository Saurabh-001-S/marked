import api from './client';

export async function uploadChartSnapshot(accountId, file) {
  const { data } = await api.post(`/accounts/${accountId}/snapshot-upload-url`, { contentType: file.type });
  await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return data.publicUrl;
}