# Telegram Join-Gate Bot (Telegraf)

ये प्रोजेक्ट एक simple Node.js bot है जो उपयोगकर्ता को पहले चैनल join करवाएगा (join-gate) और फिर username lookup की सुविधा देगा।

---

## Files
- `bot.js` — मुख्य बोट कोड
- `package.json` — dependencies और start script
- `README.md` — यह फाइल

---

## Remix / Replit / Online IDE में उपयोग करने के लिए निर्देश (तेज़ तरीका)

1. इस zip को डाउनलोड करो और अपने Remix/Replit/CodeSandbox प्रोजेक्ट में upload कर दो, या सीधे नया project बनाकर `bot.js` और `package.json` paste कर दो।
2. Environment variables सेट करो:
   - `BOT_TOKEN` — आपका बोट टोकन (उदा: `7929676392:AAFqH...`)
   - `CHANNEL_USERNAME` — आपके चैनल का username बिना `@` के (उदा: `BGMIHACKPAIDTY`)
3. Node version >= 18 रखें।
4. Dependencies इंस्टॉल करो:
   ```
   npm install
   ```
5. Run करो:
   ```
   npm start
   ```
6. सुनिश्चित करें कि:
   - Bot आपके चैनल में जोड़ा गया है (member/admin).
   - CHANNEL_USERNAME सही है।
   - Bot API की सीमाएँ समझें — फोन नंबर से arbitrary profile lookup संभव नहीं है।

---

## Notes / चेतावनी
- किसी का personal phone number lookup करना प्राइवेसी और कानूनी मुद्दे उठा सकता है। सावधानी रखें।
- अगर आप webhook पर चलाना चाहते हैं, तो बताइए — मैं webhook-ready version दे दूँगा।
