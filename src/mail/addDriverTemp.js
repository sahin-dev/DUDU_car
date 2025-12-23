const addDriverTemp = (data) =>
  ` 
    <html>
      <head>
        <style>
          body {
            font-family: 'Verdana', 'Arial', sans-serif;
            background-color: #f2f3f8;
            margin: 0;
            padding: 0;
          }
          .container {
            font-family: 'Verdana', 'Arial', sans-serif;
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #8A53FE;
            font-size: 26px;
            margin-bottom: 20px;
            font-weight: bold;
            text-align: center;
          }
          p {
            color: #555555;
            line-height: 1.8;
            font-size: 16px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          table th, table td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          table th {
            background-color: #f2f3f8;
            font-weight: bold;
          }
          .logo {
            text-align: center;
          }
          .logo-img {
            max-width: 100%;
            margin-bottom: 20px;
          }            
          .footer {
            margin-top: 30px;
            font-size: 13px;
            color: #9e9e9e;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
          }
          a {
            color: #8A53FE;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.EMAIL_TEMP_IMAGE}" alt="Logo" class="logo-img" />
          </div>        
          <h1>Welcome to DuDu!</h1>
          <p>Hello, ${data.name},</p>
          <p>We are thrilled to welcome you as a new driver in our team. Below are your account details:</p>
          
          <table>
            <tr>
              <th>Email</th>
              <td>${data.email}</td>
            </tr>
            <tr>
              <th>Password</th>
              <td>${data.password}</td>
            </tr>
            <tr>
              <th>Phone Number</th>
              <td>${data.phoneNumber}</td>
            </tr>
            <tr>
              <th>Address</th>
              <td>${data.address}</td>
            </tr>
            <tr>
              <th>Id/Passport Number</th>
              <td>${data.idOrPassportNo}</td>
            </tr>
            <tr>
              <th>Driving License Number</th>
              <td>${data.drivingLicenseNo}</td>
            </tr>
            <tr>
              <th>Driving License Type</th>
              <td>${data.licenseType}</td>
            </tr>
            <tr>
              <th>Driving License Expiry Date</th>
              <td>${data.licenseExpiry}</td>
            </tr>
          </table>

          <p>As a driver at DuDu, you play a vital role in ensuring smooth and safe rides for our customers. Please log in to your account to get started with your first trip.</p>
          <p>If you have any questions or need any assistance, feel free to reach out to us at <a href="mailto:duducar.co@gmail.com">duducar.co@gmail.com</a>.</p>
          <p>We look forward to working with you and wish you a great journey with us!</p>
          <p>Best regards,<br>The DuDu Team</p>
        </div>
        <div class="footer">
          <p>&copy; DuDu - All Rights Reserved.</p>
          <p><a href="https://yourwebsite.com/privacy">Privacy Policy</a> | <a href="https://yourwebsite.com/contact">Contact Support</a></p>
        </div>
      </body>
    </html>
  `;

module.exports = addDriverTemp;
