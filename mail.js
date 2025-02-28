
import * as nodemailer from 'nodemailer'
import { otpGenerator } from './otpauth.js';




var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'todotify02@gmail.com',
      pass: 'rluz bbcd flyb taum'
    }
  });

  
  

const sendOTPMail = (mail)=>{
  return new Promise((resolve, reject) => {
    var otp = otpGenerator(mail)
    console.log(otp)
    
var html_content = `
<html>
  <body>
    <div style="background: #020617;color:white ;height: 600px; width: 700px; border-radius: 0; padding: 20px;">
  <table style="width: 100%; background: #60A5FA; border-top-left-radius: 0; border-top-right-radius: 0;">
    <tr>
      <td style="padding: 10px;">
        <h2 style="margin: 0; font-size: 24px; color: white;">Todotify</h2>
      </td>
      <td style="text-align: right; padding: 10px;">
        <span style="color: white; font-size: 16px;">Transform Tasks into Triumphs</span>
      </td>
    </tr>
  </table>
  <div style="text-align: center; padding: 20px;">
    <h3 style="margin: 0;color:white">Login || Register</h3>
    <p style="font-size: 16px;color:white;">
      The email is intended to deliver a <strong>One-Time Password (OTP)</strong> to the user for authentication purposes during the login process but <stronger>if you fail to verify, your credentials will reset.</stronger> The OTP is a temporary code that enhances security by verifying the user's identity. The email should clearly state the purpose of the OTP, provide instructions on how to use it, and include any necessary security warnings.
    </p>
    <div style="background: #0F172A;color:white;  width: 300px; margin: 0 auto; padding: 10px; font-size: 20px; border-radius: 0;">
      <strong>One-Time Password (OTP):</strong> <span style="font-weight: bold;">${otp}</span>
    </div>
      <div style=" width: 300px; margin: 0 auto; padding: 10px; font-size: 13px; border-radius: 0;">
      <p>This Otp is Valid for 3 Minutes... (180 seconds). </p>
    </div>
  </div>
</div>
</body>
</html>

`

    var mailOptions = {
        from: 'todotify02@gmail.com',
        to: mail,
        subject: 'OTP - Todotify',
        html: html_content,
        
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          reject("Error",error)
        } else {
          console.log('Email sent: ' + info.response);
          resolve("Code Sent")
        }
      });
})
}
    

export default sendOTPMail;