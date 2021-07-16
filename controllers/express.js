import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser';

import Auth from './auth.js'
import devices, { DeviceType } from '../devices/device.js'

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.originalPath = req.baseUrl + req.path;
  req.remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
});

app.listen(process.env.httpPort, () =>  console.log(`[WEBAPI][INFO] Server startup :${process.env.httpPort}`) );

app.post('/login', (req, res) => {
  const login_result = Auth.login(req.body.id, req.body.pw);
  if(login_result) {
    res.status(201).send(login_result);
    console.log(`[WEBAPI][INFO] Client login: ${req.remoteIP}`);
  }
  else {
    res.status(401).send();
    console.log(`[WEBAPI][INFO] Client login failure: ${req.remoteIP}`);
  }
});

app.post('/autologin', (req, res) => {
  const login_result = Auth.verify(req.body.jwt);
  if(login_result) {
    res.status(201).send(login_result);
    console.log(`[WEBAPI][INFO] Client autologin: ${req.remoteIP}`);
  }
  else {
    res.status(401).send();
    console.log(`[WEBAPI][INFO] Client autologin failure: ${req.remoteIP}`);
  }
});

// send device info
app.get('/device/:deviceId', (req, res) => {
  const device = devices.find(device => device.id == req.params.deviceId);
  if(device) {
    switch (DeviceType[device.type]) {
      case 'passiveSwitch':
        res.status(200).send({ online: device.online, status: device.status });
        break;
    }
  }
  else res.status(404).send(`${req.params.deviceId} not found.`);
});

// update device status
app.post('/device/:deviceId', (req, res) => {
  if(!Auth.verify(req.body.jwt)) return res.status(401).send();
  const device = devices.find(device => device.id == req.params.deviceId);
  if(device) {
    if(device.online) {
      switch (DeviceType[device.type]) {
        case 'passiveSwitch':
          if(req.body.toggle) device.toggle();
          else if(req.body.power === 'true' || req.body.power === 'false') device.power = req.body.power;
          device.sync();
          break;
      }
      res.status(201).send();
    }
    else res.status(503).send(`device ${req.params.deviceId} is offline.`);
  }
  else res.status(404).send(`${req.params.deviceId} not found.`);
});

export default app
