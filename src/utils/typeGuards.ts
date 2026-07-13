// src/utils/typeGuards.ts
export function isValidBook(book: any): book is { 
  id: string; 
  ztf_id: string; 
  title: string; 
  theme?: string 
} {
  return book && typeof book === 'object' && !Array.isArray(book) && book.id && book.ztf_id && book.title;
}