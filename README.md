Main objective: i want to create an ai app that will have 2 primarily functions, 1 will be that user will record or upload voice recordings and ai will give a summarize in text or and voice and 2 function is that user uploads a page from a book so an image and ai will give back that text in electronic format or and spoken so recording.

Stack
Next.js (Frontend + API Routes)

Handles UI, file uploads, and API logic.

Serverless API routes simplify backend integration.

Great for SSR/static pages and React-based UIs.

Supabase (Backend Services)

PostgreSQL Database: Store user data, processed text, and metadata.

Storage: Handle file uploads (voice recordings, book page images).

Auth: Built-in user authentication.

Edge Functions: Run serverless AI processing (optional).

AI/ML Tools

Speech-to-Text (STT): OpenAI Whisper (open-source) or AWS Transcribe.

OCR: Tesseract.js (free) or Google Cloud Vision (higher accuracy).

Text Summarization: OpenAI GPT-4/3.5-turbo or Hugging Face models.

Text-to-Speech (TTS): ElevenLabs (best quality) or AWS Polly.

I want the most cost effective solution because this project is MVP.

the recordings will be audio only no video

So maybe I can use deepseek API (because its cheaper) or Open AI api.

I will need the code to integrate all of this.