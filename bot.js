/*
Telegram Join-Gate Bot — Node.js (Telegraf)
Features:
- Forces user to join a specified channel before allowing username lookup.
- Accepts username (e.g. @someone or someone) and returns public info via `getChat`.
- For phone numbers: instructs user to share contact (Bot API cannot search arbitrary phone numbers).
Usage:
- Set environment variables BOT_TOKEN and CHANNEL_USERNAME, then run: node bot.js
- Make the bot an admin/member of your channel.
*/

const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME; // without @, e.g. BGMIHACKPAIDTY

if (!BOT_TOKEN || !CHANNEL_USERNAME) {
  console.error('Missing BOT_TOKEN or CHANNEL_USERNAME. Set environment variables and restart.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// helper: build join keyboard with visible channel name on button
function joinKeyboard() {
  const url = `https://t.me/${CHANNEL_USERNAME}`;
  return Markup.inlineKeyboard([
    [ Markup.button.url(`Join @${CHANNEL_USERNAME}`, url) ],
    [ Markup.button.callback('I have joined ✅ — Check access', 'CHECK_JOIN') ]
  ]);
}

// Start
bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name || 'दोस्त';
  const welcome = `नमस्ते ${firstName}!\n\nपहले आपसे एक छोटी सी रिक्वायरमेंट है — इस बोट का उपयोग करने के लिए आपको हमारे चैनल @${CHANNEL_USERNAME} को join करना होगा।\n\nनीचे बटन से सीधे join कर सकते हैं।`;
  return ctx.reply(welcome, joinKeyboard());
});

// Handler when user clicks "I have joined" button
bot.action('CHECK_JOIN', async (ctx) => {
  try {
    const chatId = `@${CHANNEL_USERNAME}`;
    const userId = ctx.from.id;
    // getChatMember to verify membership in channel
    const member = await ctx.telegram.getChatMember(chatId, userId);

    // statuses include: 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
    if (member.status === 'creator' || member.status === 'administrator' || member.status === 'member' || member.status === 'restricted') {
      await ctx.answerCbQuery(); // remove loading spinner
      await ctx.reply('धन्यवाद — access मिल गया है। अब आप username या mobile number भेज कर information माँग सकते हैं।\n\nउदाहरण:\n`@username` या `username`\nया फोन भेजने के लिए contact शेयर करें।', { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCbQuery('Join required', { show_alert: true });
      await ctx.reply('आप अभी चैनल के सदस्य नहीं दिखे — कृपया join कर लें और फिर "I have joined" दबाएँ।', joinKeyboard());
    }
  } catch (err) {
    // possible reasons: bot not in channel, invalid channel username, or Telegram error
    console.error('CHECK_JOIN error:', err);
    await ctx.answerCbQuery('Error checking membership', { show_alert: true });
    await ctx.reply('सदस्यता की जाँच करते समय समस्या आई। सुनिश्चित करें कि bot उस चैनल में है और CHANNEL_USERNAME सही है।');
  }
});

// Text handler: username or mobile/contact
bot.on('text', async (ctx) => {
  const text = (ctx.message.text || '').trim();

  // First: verify membership before doing lookup
  try {
    const member = await ctx.telegram.getChatMember(`@${CHANNEL_USERNAME}`, ctx.from.id);
    if (!(member.status === 'creator' || member.status === 'administrator' || member.status === 'member' || member.status === 'restricted')) {
      return ctx.reply('पहले आप हमारे चैनल को join कीजिये ताकि आपको access मिल सके।', joinKeyboard());
    }
  } catch (err) {
    console.error('Membership check error:', err);
    return ctx.reply('मैं चैनल सदस्यता की जाँच नहीं कर पाया — सुनिश्चित करें कि bot चैनल में है और CHANNEL_USERNAME सही है.');
  }

  // If message looks like username (starts with @ or alphanumeric)
  let usernameCandidate = text;
  if (usernameCandidate.startsWith('/')) {
    // ignore commands
    return ctx.reply('कृपया username (या mobile number / contact) भेजें, कमांड नहीं।');
  }

  // Simple phone number detection (digits, +, spaces, hyphen)
  const phoneLike = usernameCandidate.match(/^(\+?\d{6,15})$/);
  if (phoneLike) {
    // Bot API cannot search arbitrary phone numbers.
    return ctx.reply('Phone number दर्ज किया गया — मैं सीधे किसी भी नंबर से सार्वजनिक profile खोज नहीं सकता।\n\nOptions:\n1) कृपया उस व्यक्ति का Telegram contact **share** करें (attach contact) — तब मैं उसका नाम/username पढ़ पाऊँगा।\n2) या उस व्यक्ति का public username भेजें (यदि है)।\n\n(Privacy कारणों से arbitrary phone-to-profile lookup Bot API से संभव नहीं होता)');
  }

  // Treat as username
  if (!usernameCandidate.startsWith('@')) usernameCandidate = '@' + usernameCandidate;

  try {
    // Attempt to get public chat info
    const chatInfo = await ctx.telegram.getChat(usernameCandidate);

    // Prepare response with important public fields (only those available)
    const parts = [];
    parts.push(`🔎 Public info for ${usernameCandidate}:`);
    if (chatInfo.id) parts.push(`• id: \`${chatInfo.id}\``);
    if (chatInfo.type) parts.push(`• type: ${chatInfo.type}`);
    if (chatInfo.title) parts.push(`• title: ${chatInfo.title}`);
    if (chatInfo.username) parts.push(`• username: @${chatInfo.username}`);
    if (chatInfo.first_name || chatInfo.last_name) {
      const n = `${chatInfo.first_name || ''} ${chatInfo.last_name || ''}`.trim();
      parts.push(`• name: ${n}`);
    }
    if (chatInfo.bio) parts.push(`• bio: ${chatInfo.bio}`);
    if (chatInfo.description) parts.push(`• description: ${chatInfo.description}`);
    if (chatInfo.invite_link) parts.push(`• invite_link: ${chatInfo.invite_link}`);
    if (chatInfo.photo) {
      parts.push('• has profile photo');
    }

    await ctx.replyWithMarkdown(parts.join('\n'));
    // If profile photo exists, we can try to fetch file_id via getUserProfilePhotos (only for users)
    if (chatInfo.type === 'private') {
      try {
        const photos = await ctx.telegram.getUserProfilePhotos(chatInfo.id, 0, 1);
        if (photos.total_count > 0) {
          await ctx.reply('Profile photo found — sending thumbnail...');
          await ctx.replyWithPhoto(photos.photos[0][0].file_id);
        }
      } catch (e) {
        // ignore photo errors
      }
    }
  } catch (err) {
    console.error('getChat error:', err);
    // Common reasons: username not exist / not a public username / Telegram error
    return ctx.reply('मुझे उस username की public जानकारी नहीं मिली। सुनिश्चित करें कि username सही है और वो public profile है।');
  }
});

// Handler for shared contact (user can press attach contact)
bot.on('contact', async (ctx) => {
  // membership check first
  try {
    const member = await ctx.telegram.getChatMember(`@${CHANNEL_USERNAME}`, ctx.from.id);
    if (!(member.status === 'creator' || member.status === 'administrator' || member.status === 'member' || member.status === 'restricted')) {
      return ctx.reply('पहले चैनल join करें ताकि आपको access मिले।', joinKeyboard());
    }
  } catch (err) {
    return ctx.reply('चैनल सदस्यता जाँची नहीं जा सकी।');
  }

  const contact = ctx.message.contact;
  // Bot receives phone number and first/last name shared by user
  const info = [
    `Contact received:`,
    `• Name: ${contact.first_name || ''} ${contact.last_name || ''}`,
    `• Phone: ${contact.phone_number}`,
  ];
  await ctx.reply(info.join('\n'));
  // Note: Bot still cannot map arbitrary phone to Telegram user unless contact belongs to the user themselves or bot can use other APIs.
});

// Generic error logging
bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.launch().then(() => {
  console.log('Bot started — polling mode');
  console.log('Make sure bot is member/admin of @' + CHANNEL_USERNAME);
});

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
