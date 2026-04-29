// netlify/functions/gemini.js
// ══════════════════════════════════════════════════════════════
// Netlify Serverless Function — بوابة آمنة لـ Gemini API
// المفتاح يُقرأ من متغير البيئة GEMINI_API_KEY في Netlify
// ══════════════════════════════════════════════════════════════

exports.handler = async (event) => {

  // السماح بطلبات CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // معالجة طلبات OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // قبول POST فقط
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // قراءة المفتاح من البيئة — يُضبط في Netlify Dashboard
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set in Netlify environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY غير مضبوط في متغيرات بيئة Netlify' })
    };
  }

  // استخراج الـ prompt من الطلب
  let prompt;
  try {
    const body = JSON.parse(event.body || '{}');
    prompt = body.prompt;
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'طلب غير صالح — تعذّر قراءة البيانات' })
    };
  }

  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'الحقل prompt مطلوب' })
    };
  }

  // استدعاء Gemini API
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      })
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      return {
        statusCode: geminiRes.status,
        headers,
        body: JSON.stringify({
          error: `خطأ من Gemini API: ${geminiRes.status}`,
          details: errData
        })
      };
    }

    const data = await geminiRes.json();

    // استخراج النص من استجابة Gemini
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '';

    if (!text) {
      console.error('Gemini returned empty response:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini أعاد استجابة فارغة' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text })
    };

  } catch (err) {
    console.error('Netlify Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'خطأ داخلي في الخادم: ' + err.message })
    };
  }
};
