const VISITOR_ID_KEY = 'storymentor_visitor_id';

function generateVisitorId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `visitor_${randomPart}${timePart}`;
}

export function getVisitorId(): string {
  let visitorId: string | null = null;
  if (typeof window !== 'undefined') {
    visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
  }
  if (visitorId) {
    return visitorId;
  }
  const newId = generateVisitorId();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VISITOR_ID_KEY, newId);
  }
  return newId;
}
