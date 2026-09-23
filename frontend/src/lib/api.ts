export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");
export async function api<T>(path:string, init:RequestInit = {}):Promise<T>{
  const response=await fetch(API_URL+path,{...init,credentials:"include",headers:{"Content-Type":"application/json",...init.headers}});
  if(!response.ok){
    const messages:Record<number,string>={400:"Проверьте параметры запроса.",401:"Сессия истекла. Начните новый диалог.",403:"Нет доступа к этой сессии.",413:"Сообщение слишком длинное.",429:"Слишком много запросов. Подождите минуту.",502:"EKT временно недоступен. Повторите запрос."};
    throw new Error(messages[response.status]||"Не удалось получить данные. Проверьте подключение и повторите запрос.");
  }
  return response.json();
}
