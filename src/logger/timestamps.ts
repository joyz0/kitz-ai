export function formatLocalIsoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
  const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
  const offsetStr = `${sign}${hours}:${minutes}`;
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours24 = date.getHours().toString().padStart(2, "0");
  const minutes24 = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
  
  return `${year}-${month}-${day}T${hours24}:${minutes24}:${seconds}.${milliseconds}${offsetStr}`;
}
