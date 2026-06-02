// Derive avatar initials from a display name.
// - "Hong Gildong" → "HG"  (라틴 다단어: 두 단어의 첫 글자)
// - "Hong"         → "HO"  (라틴 단일어: 앞 두 글자)
// - "정현우"        → "정"   (한글 등 CJK: 첫 글자만)
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0];
    return /[A-Za-z]/.test(word[0]) ? word.slice(0, 2).toUpperCase() : word.slice(0, 1);
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};
