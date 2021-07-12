const express = require('express');
const router = express.Router();
const assert = require('assert');[]
var models  = require('../../models');
let UserApplication = models.user_application;
let Application = models.application;
const validatorUtil = require('../../utils/validator');
const { body, query, validationResult } = require('express-validator');
const NotificationModule = require('../notifications/email-notification');
const authServiceUtil = require('../../utils/auth-service-utils');
let Sequelize = require('sequelize');
const Op = Sequelize.Op;
const multer = require('multer');
const fs = require('fs');


router.get('/app_list', (req, res) => {
  console.log("[app/read.js] - App route called");

  try {
    models.application.findAll({order: [['updatedAt', 'DESC']]}).then(function(applications) {
        res.json(applications);
    })
    .catch(function(err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Error occured while getting application list" });
    });
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while getting application list" });
  }
});
router.get('/appListByUserId', (req, res) => {
  console.log("[app/read.js] -  Get app list for user id ="+ req.query.user_id);

  try {
    models.application.findAll({where:{
      [Op.or]: [
        {"$user_id$":req.query.user_id},
        {"$user_id$": req.query.user_name}
      ]
    }, order: [['updatedAt', 'DESC']],
    include: [UserApplication]
        }).then(function(applications) {
        res.json(applications);
    })
    .catch(function(err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Error occured while getting application list" });
    });
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while getting application list" });
  }
});

router.get('/app', [
  query('app_id')
    .isUUID(4).withMessage('Invalid application id')
], (req, res) => {
  const errors = validationResult(req).formatWith(validatorUtil.errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  console.log("[app/read.js] - App route called: "+req.query.app_id);

  try {
    models.application.findOne({
        where: {"id":req.query.app_id}
    }).then(function(application) {
        res.json(application);
    })
    .catch(function(err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Error occured while getting application details" });
    });
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while getting application details" });
  }
});

router.post('/newapp', [
  body('user_id')
    .optional({checkFalsy:true})
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid user_id'),
  body('title')
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid title'),
  body('description')
    .optional({checkFalsy:true}),
  body('creator')
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid creator'),
],function (req, res) {
  const errors = validationResult(req).formatWith(validatorUtil.errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    if(req.body.id == '') {
      models.application.create({"title":req.body.title, "description":req.body.description, "creator": req.body.creator}).then(function(application) {
        if(req.body.user_id)
          models.user_application.create({"user_id":req.body.user_id, "application_id":application.id}).then(function(userapp) {
          res.json({"result":"success", "id": application.id});
        });
      else
          res.json({"result":"success", "id": application.id});
      });
    } else {
      models.application.update(req.body, {where:{id:req.body.id}}).then(function(result){
          res.json({"result":"success", "id": result.id});
      })
    }
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while creating application" });
  }
});

router.post('/removeapp', function (req, res) {
  try {
      models.application.destroy({
          where:{id: req.body.appIdsToDelete}
      }).then(function(deleted) {
          return res.status(200).send({"result":"success"});
      });
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while removing application" });
  }
});

router.post('/saveUserApp', function (req, res) {
  console.log("[app/read.js] - saveUserApp called");
  var userAppList=req.body.users;
  try {
    UserApplication.bulkCreate(userAppList).then(async function(application) {
      let userDetail = await authServiceUtil.getUserDetails(req, userAppList[0].user_id);
      Application.findOne({where: {id:userAppList[0].application_id}}).then((application) => {
        NotificationModule.notifyApplicationShare(userDetail[0].email, application.title, req);
      })
      res.json({"result":"success"});
    });
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({ success: false, message: "Error occured while saving user application mapping" });
  }
});

//Import application
let upload = multer();
upload = multer({ dest: 'uploads/'})
const validateJSON = (data) =>{
  try{
    var data = JSON.parse(data)
    return data;
  }catch(e){
    return "error"
  }
}

// Remove file
const removeFile = (filePath) => {
  setTimeout(() => {
    fs.unlink(filePath, (err) =>{
      if(err){
        console.log("<<<< <<<<<<<<<< Error Deleting file", err)
      }else{
        console.log("<<<< <<<<<<<<<< File deleted")
      }
    })    },2000)
}

router.post('/importApp', [
  body('user_id')
    .optional({checkFalsy:true})
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid user_id'),
  body('title')
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid title'),
  body('description')
    .optional({checkFalsy:true}),
  body('creator')
    .matches(/^[a-zA-Z]{1}[a-zA-Z0-9_:.\-]*$/).withMessage('Invalid creator'),
], upload.single("file"), function (req, res) {
  console.log("<<<< <<<<<<<<<< File RequestRequest", req.file)
  console.log("<<<< <<<<<<<<<< Body Request", req.body.user);
  fs.readFile(`uploads/${req.file.filename}`, (err,data) => {
  if(err){
    console.log("<<<< <<<<<<<<<< Issue uploading file")
    res.status().send("Unable to read file. Data must be in JSON format")
    return;
  }else{
    console.log("<<<< validating if data is in JSON")
    let parsedData = validateJSON(data)
    console.log("<<<< Parsed Data", parsedData)
    if(parsedData === "error"){
      console.log("<<<< <<<<<<<<<< Data is not in JSON format");
      removeFile(`uploads/${req.file.filename}`);
      res.status(404).send({success: false, error: "Unable to read file uploaded. Data must be in JSON format"});
      return;
    }else {
      if(parsedData.application){
        console.log("<<<< <<<<<<<<<< Application ID present")
        const {application} = parsedData;
        //1.   <<<< Start creating app
        // 1.a <<<< send update to client ... creating app 
        // 1.b. <<<< Check if application with same name is present
        try {
          models.application.findAll({where:{
       "creator": "ladad"
          }, order: [['updatedAt', 'DESC']],
          include: [UserApplication]
              }).then(function(applications) {
                console.log("<<<<<<<<<<<<<<<<<<< Mapping", applications)
                applications.map(item =>console.log("<<<<<<<<<<<<<<<<<<<<< Items ",  item.title))
                const matchedApp = applications.filter(app => app.title === application.title)
                console.log("<<<< Matched apps ", matchedApp)
                if( matchedApp.length > 0){
                  //1.c <<<<< App with same title already exists. send upadte to client
                  // TODO - get user input if they want to override existing app and move forward accordingly
                  console.log("<<<< app with this title already exists")
                  res.status(200).json({success: false, message: `Application with title ${application.title} already exists `})
                }else{
                  //1.d <<<< app with same title not found create app - Send update to client
                  console.log("<<<< Unique app title go forward")
                  try {
                    models.application.create({"title": application.title, "description":application.description, "creator" : req.body.user}).then(function(application) {
                      
                      if(req.body.user_id)
                        models.user_application.create({"user_id":req.body.user, "application_id":application.id}).then(function(userapp) {
                        res.json({"result":"success", "id": application.id});
                        // <<<< Success send update to client
                        // <<<< Create rest of the assets
                      });
                    else
                        res.json({"result":"success", "id": application.id});
                        // <<<< Send update to client
                    });
        
                } catch (err) {
                  console.log('err', err);
                  // <<<< Issue creating application
                  return res.status(500).json({ success: false, message: "Error occured while creating application" });
                }
                }
          })
          .catch(function(err) {
            console.log(err);
            // <<<< Not able to get app list for checking if app already exists
            return res.status(500).json({ success: false, message: "Error occured while getting application list" });
          });
        } catch (err) {
          console.log('err', err);
          // <<<< send update to client
          return res.status(500).json({ success: false, message: "Error occured while getting application list" });
        }
        removeFile(`uploads/${req.file.filename}`);
      }
      else{
        console.log("<<<< No app ID");
        //File uploaded does not have app ID
        res.status(404).send({success: false, error: "Unable to read file uploaded. Data must be in JSON format"});
        removeFile(`uploads/${req.file.filename}`);
      }
    }}
})
});

/*
{
  "application": {
    "title": "",
    "name": "",
    "description": "",
    "cluster":"",
    "assets": {
      "files": [{
        "basic": {
          "name":"",
          "title":"",
          "description":"",
          "scope":"",
          "serviceURL":"",
          "path": "",
          "isSuperFile":false,
          "supplier": "",
          "consumer":"",
          "owner":""
        },
        "layout":{

        },
        "permissioblePurposes": {

        },
        "validationRule": {

        }
      }],
      "jobs": [{
        "basic": {
          "name":"",
          "title":"",
          "description":"",
          "gitRepo":"",
          "entryBWR": "",
          "contactEmail": "",
          "author": ""
        },
        "ecl": "",
        "inputParams": [],
        "inputFiles": [],
        "outputFiles": []
      }]
    }    
  }

*/
module.exports = router;