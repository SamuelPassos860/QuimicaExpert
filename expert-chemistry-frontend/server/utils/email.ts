import net from 'node:net';
import tls from 'node:tls';

interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

function getSmtpPort() {
  const port = Number(process.env.SMTP_PORT || 587);
  return Number.isFinite(port) ? port : 587;
}

function getMailFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@quimicaexpert.local';
}

function getEnvelopeAddress(value: string) {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] || value).trim();
}

function isSmtpSecure() {
  return process.env.SMTP_SECURE === 'true' || getSmtpPort() === 465;
}

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function normalizeSmtpLine(value: string) {
  return value.replace(/\r?\n/g, ' ').trim();
}

function buildRawMessage(message: MailMessage) {
  const from = getMailFrom();
  const lines = [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${normalizeSmtpLine(message.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    message.text
  ];

  return `${lines.join('\r\n')}\r\n`;
}

async function connectSmtp(host: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = isSmtpSecure()
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));

    socket.once('error', reject);
  });
}

function readSmtpResponse(socket: net.Socket) {
  return new Promise<string>((resolve, reject) => {
    let response = '';

    const onData = (chunk: Buffer) => {
      response += chunk.toString('utf8');
      const lines = response.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';

      if (/^\d{3} /.test(lastLine)) {
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(response);
      }
    };

    const onError = (error: Error) => {
      socket.off('data', onData);
      reject(error);
    };

    socket.on('data', onData);
    socket.once('error', onError);
  });
}

async function sendCommand(socket: net.Socket, command: string, expectedCodes: number[]) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const code = Number(response.slice(0, 3));

  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed (${command}): ${response.trim()}`);
  }

  return response;
}

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(message: MailMessage) {
  const host = process.env.SMTP_HOST;

  if (!host) {
    throw new Error('SMTP_HOST is not configured.');
  }

  const port = getSmtpPort();
  const socket = await connectSmtp(host, port);

  try {
    await readSmtpResponse(socket);
    await sendCommand(socket, `EHLO ${process.env.SMTP_EHLO_DOMAIN || 'localhost'}`, [250]);

    if (!isSmtpSecure() && process.env.SMTP_STARTTLS !== 'false') {
      await sendCommand(socket, 'STARTTLS', [220]);
      const secureSocket = tls.connect({ socket, servername: host });
      await new Promise<void>((resolve, reject) => {
        secureSocket.once('secureConnect', resolve);
        secureSocket.once('error', reject);
      });

      await sendCommand(secureSocket, `EHLO ${process.env.SMTP_EHLO_DOMAIN || 'localhost'}`, [250]);
      await authenticateAndSend(secureSocket, message);
      return;
    }

    await authenticateAndSend(socket, message);
  } finally {
    socket.end();
  }
}

async function authenticateAndSend(socket: net.Socket, message: MailMessage) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = getMailFrom();
  const envelopeFrom = getEnvelopeAddress(from);

  if (user && pass) {
    await sendCommand(socket, 'AUTH LOGIN', [334]);
    await sendCommand(socket, encodeBase64(user), [334]);
    await sendCommand(socket, encodeBase64(pass), [235]);
  }

  await sendCommand(socket, `MAIL FROM:<${envelopeFrom}>`, [250]);
  await sendCommand(socket, `RCPT TO:<${message.to}>`, [250, 251]);
  await sendCommand(socket, 'DATA', [354]);

  socket.write(`${buildRawMessage(message).replace(/\r?\n\./g, '\r\n..')}\r\n.\r\n`);
  const response = await readSmtpResponse(socket);
  const code = Number(response.slice(0, 3));

  if (code !== 250) {
    throw new Error(`SMTP DATA failed: ${response.trim()}`);
  }

  await sendCommand(socket, 'QUIT', [221]);
}
