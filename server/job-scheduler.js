const Bree = require('bree');
const models = require('./models');
var path = require('path');
let Job = models.job;
const hpccUtil = require('./utils/hpcc-util');
const assetUtil = require('./utils/assets.js');
let MessageBasedJobs = models.message_based_jobs;
const SUBMIT_JOB_FILE_NAME = 'submitJob.js';
const SUBMIT_SCRIPT_JOB_FILE_NAME = 'submitScriptJob.js';
const JOB_STATUS_POLLER = 'statusPoller.js';
const notificationMoudle = require("./utils/manualJobNotification");
const workflowUtil = require('./utils/workflow-util');


class JobScheduler {
  constructor() {
    this.bree = new Bree({
     root: false,
     errorHandler: (error, workerMetadata) => {
      if (workerMetadata.threadId) {
        console.log(`There was an error while running a worker ${workerMetadata.name} with thread ID: ${workerMetadata.threadId}`)
      } else {
        console.log(`There was an error while running a worker ${workerMetadata.name}`)
      }

      console.error(error);
      //errorService.captureException(error);
    }
    });
    (async () => {
      await this.bootstrap();
      //this.bree.start();
    })();
  }

  async bootstrap() {
    await this.scheduleActiveCronJobs();
  
    await this.scheduleJobStatusPolling();
  }

 
  //Handle Manual Job 
  async handleManualJobScheduling (job){
    console.log("<<<<<<<<<<<<<<< Hanlding manual job >>>>>>>>>>>>>>>>>>>", job);

    //Test
    workflowUtil.notifyManualJob()  ;     
    // let notificationOptions = {
    //   for : 'manaulJob',
    //   jobName : job.name,
    //   jobTitle: job.title,
    //   contact: job.contact,
    //   url : `${process.env.WEB_URI}${job.application_id}/manualJobDetails/${job.id}`
    // }

    // const result = await notificationMoudle.sendEmailNotification(notificationOptions)
    
    // if(result.accepted){
    //   // once the end user is notified add the job to job execution queue 
    //   // const wuid = await hpccUtil.getJobWuidByName(job.clusterId, job.name);    
    //   let manualJob_meta = {
    //     notifiedTo : job.contact,
    //     notifiedOn: new Date().getTime(),
    //     url : `/${job.application_id}/manualJobDetails/${job.id}`,
    //     jobName : job.name,
    //     jobTitle: job.title,
    //   };

    //   let jobExecutionData = {
    //     name: job.name, 
    //     clusterId: job.clusterId, 
    //     dataflowId: job.dataflowId, 
    //     applicationId: job.application_id, 
    //     jobId: job.id, 
    //     jobType: job.jobType == 'Script' ? SUBMIT_SCRIPT_JOB_FILE_NAME : SUBMIT_JOB_FILE_NAME,
    //     sprayedFileScope: job.sprayedFileScope,
    //     sprayFileName: job.sprayFileName,
    //     sprayDropZone: job.sprayDropZone,
    //     // status: 'wait',
    //     manualJob_meta : manualJob_meta
    //   }

    //   await assetUtil.recordJobExecution(jobExecutionData, wuid)
    // }else{
    //   console.log(result)
    // }
  } 

  async scheduleCheckForJobsWithSingleDependency(jobName) {
    return new Promise(async (resolve, reject) => {    
      try {
        const query = `SELECT j1.id, j1.name, j1.title, j1.contact, j1.jobType, j1.sprayedFileScope, j1.sprayFileName, j1.sprayDropZone, dj.dependsOnJobId as dependsOnJobId, dj.jobId, c.id as clusterId, d.id as dataflowId, d.application_id, count(*) as count
          FROM tombolo.dependent_jobs dj
          left join job j1 on j1.id = dj.jobId
          left join job j2 on j2.id = dj.dependsOnJobId
          left join dataflow d on d.id = dj.dataflowId
          left join cluster c on c.id = d.clusterId
          where j2.name=(:jobName)
          and j1.deletedAt is null
          and j2.deletedAt is null
          and dj.deletedAt is null
          group by dj.jobId
          having count = 1
          order by d.updatedAt desc
          ;`;

        let replacements = { jobName: jobName};
        //getting jobs based on above query
        const jobs = await models.sequelize.query(query, {
          type: models.sequelize.QueryTypes.SELECT,
          replacements: replacements
        });
        

        //Lopping through all the jobs
        for(const job of jobs) {
          if(job.jobType === "Manual"){
            console.log("scheduleCheckForJobsWithSingleDependency <<<<<<<<<<<<<<<<< manual job")
            await this.executeJob(job);
            // await this.handleManualJobScheduling(job);
            // console.log("<<<<<<<<<<<<<<<< Dependent job is manual >>>>>>>>>>>>>", job);
            // let jobExecutionData = {
            //   name: job.name, 
            //   clusterId: job.clusterId, 
            //   dataflowId: job.dataflowId, 
            //   applicationId: job.application_id, 
            //   jobId: job.id, 
            //   jobType: job.jobType == 'Script' ? SUBMIT_SCRIPT_JOB_FILE_NAME : SUBMIT_JOB_FILE_NAME,
            //   sprayedFileScope: job.sprayedFileScope,
            //   sprayFileName: job.sprayFileName,
            //   sprayDropZone: job.sprayDropZone,
            //   status: 'submitted',
            //   manualJob_meta : {jobName : job.name, jobType : 'Manual', contact: job.contact, title : job.title}
            // }
            // const result = await assetUtil.recordJobExecution(jobExecutionData);
            // console.log("<<<<<<<<<<< Dependent manual job record job execution result ", result)
          }else{   
              // Getting wuid
            const  wuid = await hpccUtil.getJobWuidByName(job.clusterId, job.name);      
            console.log(`submitting dependant job ${job.name} (WU: ${wuid}) to url ${job.clusterId}/WsWorkunits/WUResubmit.json?ver_=1.78`);

            //submit the dependant job's wu and record the execution in job_execution table for the statusPoller to pick
            let wuInfo = await hpccUtil.resubmitWU(job.clusterId, wuid); 

            let jobExecutionData = {
              name: job.name, 
              clusterId: job.clusterId, 
              dataflowId: job.dataflowId, 
              applicationId: job.application_id, 
              jobId: job.id, 
              jobType: job.jobType == 'Script' ? SUBMIT_SCRIPT_JOB_FILE_NAME : SUBMIT_JOB_FILE_NAME,
              sprayedFileScope: job.sprayedFileScope,
              sprayFileName: job.sprayFileName,
              sprayDropZone: job.sprayDropZone,
              status: 'submitted'
            }
            await assetUtil.recordJobExecution(jobExecutionData, wuid)
          }
          
        }      
        resolve();
      } catch (err) {
        console.log(err)
        reject(err)
      }
    });
  }

  async scheduleActiveCronJobs() {
    let promises=[];
    const query = `SELECT ad.id, ad.cron, j.title, j.contact, j.name as name, j.jobType, j.sprayedFileScope, j.sprayFileName, j.sprayDropZone, ad.dataflowId, ad.assetId, d.application_id, c.id as clusterId, c.thor_host, c.thor_port,
      d.title as dataflowName
      FROM tombolo.assets_dataflows ad
      left join dataflow d on d.id = ad.dataflowId
      left join job j on j.id = ad.assetId
      left join cluster c on c.id = d.clusterId
      where ad.cron IS NOT NULL
      and ad.deletedAt IS NULL
      order by ad.updatedAt desc
      ;`;

    const jobs = await models.sequelize.query(query, {
      type: models.sequelize.QueryTypes.SELECT,
    });

    for(const job of jobs) {
      console.log(`
        fetch WU id from ${job.thor_host}:${job.thor_port}/WsWorkunits/WUQuery.json for job name: ${job.name}
        add job to bree { name: ${job.name}, cron: ${job.cron}, path: ..., workerData: {workunitId: $WUID, cluster: ${job.thor_host}, ...} }
      `);
      try {
        // finally add the job to the scheduler
        await this.addJobToScheduler(
          job.name, 
          job.cron, 
          job.clusterId, 
          job.dataflowId, 
          job.application_id, 
          job.assetId, 
          job.jobType == 'Script' ? SUBMIT_SCRIPT_JOB_FILE_NAME : SUBMIT_JOB_FILE_NAME,
          job.jobType,
          job.contact,
          job.title,
          job.sprayedFileScope,
          job.sprayFileName,
          job.sprayDropZone,
        );
      } catch (err) {
        console.log(err);
      }
     }
  }

  async scheduleMessageBasedJobs(message) {
    try {
      let job = await Job.findOne({where: {name: message.jobName}, attributes: {exclude: ['assetId']}});
      if(job) {
        let messageBasedJobs = await MessageBasedJobs.findAll({where: {jobId: job.id}});
        for(const messageBasedjob of messageBasedJobs) {
          await this.executeJob(
            job.name,
            job.cluster_id,
            messageBasedjob.dataflowId,
            messageBasedjob.applicationId,
            job.id,
            job.jobType == 'Script' ? SUBMIT_SCRIPT_JOB_FILE_NAME : SUBMIT_JOB_FILE_NAME,
            job.jobType,
            job.sprayedFileScope,
            job.sprayFileName,
            job.sprayDropZone
            );
        }
      } else {
        console.error("***Could not find job with name "+message.jobName);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async addJobToScheduler(name, cron, clusterId, dataflowId, applicationId, jobId, jobfileName, jobType,  contact, title, sprayedFileScope, sprayFileName, sprayDropZone,) {
    try {
      let uniqueJobName = name + '-' + dataflowId + '-' + jobId;
      this.bree.add({
        name: uniqueJobName,
        cron: cron,
        path: path.join(__dirname, 'jobs', jobfileName),
        worker: {
          workerData: {
            jobName: name,
            clusterId: clusterId,
            jobId: jobId,
            applicationId: applicationId,
            dataflowId: dataflowId,
            jobType: jobType,
            title: title,
            contact : contact,
            sprayedFileScope: sprayedFileScope,
            sprayFileName: sprayFileName,
            sprayDropZone: sprayDropZone,
          }
        }
      })

      this.bree.start(uniqueJobName);
    } catch (err) {
      console.log(err);
    }
  }

  // async executeJob(name, clusterId, dataflowId, applicationId, jobId, jobfileName, jobType, sprayedFileScope, sprayFileName, sprayDropZone) {
    async executeJob(job) {
    console.log("Calling from inside execute Job function <<<<<<<<<<<", job)
    try {
      let uniqueJobName = job.name + '-' + job.dataflowId + '-' + job.id;
      console.log(uniqueJobName, "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
      //TDO - first check before trying to remoe from the queue. It is throwing err if the job is not there
      // await this.removeJobFromScheduler(uniqueJobName);
      this.bree.add({
        name: uniqueJobName,
        timeout: 0,
        path: path.join(__dirname, 'jobs', "submitManualJob.js"),
        worker: {
          workerData: {
            jobName: job.name,
            contact: job.contact,
            clusterId: job.clusterId,
            jobId: job.id,
            dataflowId: job.dataflowId,
            applicationId: job.application_id,
            status : 'wait',
            manualJob_meta : {jobType : 'Manual', jobName: job.name, notifiedTo : job.contact, notifiedOn : new Date().getTime()}
          }
        }
      })

      this.bree.start(uniqueJobName);
      
      // return {success : true, message : `Successfully executed ${job.name}`}
    } catch (err) {
      console.log(err);
      // return {success : false, message : `Error executing  ${job.name} - ${err}`}
    }
  }

  async removeJobFromScheduler(name) {
    try {
      await this.bree.remove(name);
    } catch (err) {
      console.log(err)
    }
  }

  async scheduleJobStatusPolling() {    
    console.log(`
      status polling scheduler started...
    `);
    try {
      let jobName = 'job-status-poller-'+new Date().getTime();
      //if(job) {
        this.bree.add({
          name: jobName,
          interval: '20s',
          path: path.join(__dirname, 'jobs', JOB_STATUS_POLLER),
          worker: {
            workerData: {
              jobName: jobName
            }
          }
        })

        this.bree.start(jobName);  
      //}
  
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = new JobScheduler();