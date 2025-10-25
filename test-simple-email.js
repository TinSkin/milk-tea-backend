import sgMail from './mail/sendgrid/sendgrid.config.js';

async function testSimpleEmail() {
    try {
        const msg = {
            to: 'tinskin1@gmail.com', // Your verified email
            from: 'tinskin1@gmail.com', // Verified sender
            subject: 'SendGrid Test - Simple Email',
            text: 'This is a test email from SendGrid',
            html: '<h1>Test Email</h1><p>If you receive this, SendGrid works!</p>',
        };

        const result = await sgMail.send(msg);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result[0].headers['x-message-id']);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Details:', error.response.body);
        }
    }
}

testSimpleEmail();