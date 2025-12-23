const addDriverTemp = (data) =>
  ` 
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f2f3f8;
            margin: 0;
            padding: 0;
          }
          .container {
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
          .image-gallery {
            margin-top: 20px;
            text-align: center;
          }
          .image-gallery img {
            width: 100px;
            height: auto;
            margin: 10px;
            border-radius: 5px;
            border: 1px solid #ddd;
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
              <th>Driver ID</th>
              <td>${data.driverId}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${data.email}</td>
            </tr>
            <tr>
              <th>Password</th>
              <td>${data.password}</td>
            </tr>
            <tr>
              <th>Phone No</th>
              <td>${data.phoneNumber}</td>
            </tr>
            <tr>
              <th>License Number</th>
              <td>${data.licenseNumber}</td>
            </tr>
            <tr>
              <th>License Expiry Date</th>
              <td>${data.licenseExpDate}</td>
            </tr>
            <tr>
              <th>Vehicle Type</th>
              <td>${data.vehicleType}</td>
            </tr>
            <tr>
              <th>Vehicle Number</th>
              <td>${data.vehicleNumber}</td>
            </tr>
            <tr>
              <th>Duty Hours</th>
              <td>${data.dutyTime}</td>
            </tr>
            <tr>
              <th>Break Time</th>
              <td>${data.breakTimeStart} - ${data.breakTimeEnd}</td>
            </tr>
            <tr>
              <th>Working Days</th>
              <td>${data.workDays}</td>
            </tr>
            <tr>
              <th>Off Day</th>
              <td>${data.offDay}</td>
            </tr>
          </table>

          <div class="image-gallery">
            <h2>Uploaded Documents</h2>
            <img src="${process.env.BASE_URL}:${process.env.PORT}/${data.profile_image}" alt="Profile Image" />
            <img src="${process.env.BASE_URL}:${process.env.PORT}/${data.id_or_passport_image}" alt="ID or Passport Image" />
            <img src="${process.env.BASE_URL}:${process.env.PORT}/${data.psv_license_image}" alt="PSV License Image" />
            <img src="${process.env.BASE_URL}:${process.env.PORT}/${data.driving_license_image}" alt="Driving License Image" />
          </div>

          <p>As a driver at [Your Company Name], you play a vital role in ensuring smooth and safe rides for our customers. Please log in to your account to get started with your first trip.</p>
          <p>If you have any questions or need any assistance, feel free to reach out to us at <a href="mailto:duducar.co@gmail.com">duducar.co@gmail.com</a>.</p>
          <p>We look forward to working with you and wish you a great journey with us!</p>
          <p>Best regards,<br>The [Your Company Name] Team</p>
        </div>
        <div class="footer">
          <p>&copy; [Your Company Name] - All Rights Reserved.</p>
          <p><a href="https://yourwebsite.com/privacy">Privacy Policy</a> | <a href="https://yourwebsite.com/contact">Contact Support</a></p>
        </div>
      </body>
    </html>
  `;

module.exports = addDriverTemp;
