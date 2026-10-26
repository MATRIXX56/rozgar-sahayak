# Rozgaar Sahayak – deploy guide (Hinglish)

Folder mein 4 cheezein hain:
- `index.html` – poora app (chat, studio, schemes, interview, mock test…)
- `api/chat.js` – chhota backend. **API key sirf yahin (server par) rehti hai.**
- `package.json`, `.env.example` – settings

## Step 1: API key lein (ek chuniye, ya dono)
- **Gemini**: https://aistudio.google.com → "Get API key" → Create API key.
  Google Cloud Console mein key ko **"Generative Language API" tak restrict** karein.
- **Groq**: https://console.groq.com/keys → Create API key.

## Step 2: Code GitHub par daalein
1. github.com par naya repository banayein.
2. Is poore folder ki files upload karein (`index.html`, `api/`, `package.json`, `README.md`).
3. **Asli key kisi file mein na likhein.**

## Step 3: Vercel par deploy (free)
1. vercel.com par login karein → **Add New → Project** → apni GitHub repo chunein.
2. **Environment Variables** mein daalein:
   - `AI_PROVIDER` = `gemini` (ya `groq`)
   - `GEMINI_API_KEY` = aapki key
   - `GROQ_API_KEY` = aapki key (optional: dono hongi to ek fail hone par doosri apne aap chalti hai)
3. **Deploy** dabayein. Aapko ek link milega, jaise `https://mera-app.vercel.app`.
4. Deploy ke baad `ALLOWED_ORIGIN` = apna link daalkar **Redeploy** karein. Isse sirf aapki site API use kar paayegi.

## Step 4: Test
Link kholein, Chat mein "hello" likhein. Jawab aaye to sab theek hai.
Error aaye to Vercel → Project → **Logs** dekhein (wahan sirf error dikhta hai, log mein user ka text save nahi hota).

## Dhyan rakhein
- **Free limits kam hoti hain.** Groq ke 70B model par free mein lagbhag 1,000 requests/din ya 100K tokens/din (Groq ki limits page par check karein). Zyada users ho jayein to paid plan lena padega.
- **Privacy:** Gemini ke free tier mein Google likhe hue content ko apne products sudharne ke liye use kar sakta hai. Asli users ke resume (phone, address) ke liye paid tier ya Groq ki shartein padhkar chunein. App mein Aadhaar/bank details na likhne ki chetavni di gayi hai.
- Rate limit `api/chat.js` mein "best effort" hai (har server instance ka alag). Bahut traffic par Vercel ka WAF/Upstash jaisa proper limiter lagayein.
- Local test: `npx vercel dev` (env variables `.env.local` mein).
- Model ke naam badalte rehte hain. Agar error aaye to `GEMINI_MODEL` ya `GROQ_MODEL` env variable se naya naam daalein.
