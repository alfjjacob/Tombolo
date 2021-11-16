const { parentPort, workerData } = require("worker_threads");
const request = require('request-promise');
const hpccUtil = require('../utils/hpcc-util');
const assetUtil = require('../utils/assets.js');
const workflowUtil = require('../utils/workflow-util.js');
const jobScheduler = require('../job-scheduler');

let isCancelled = false;
if (parentPort) {
  parentPort.once('message', (message) => {
    if (message === 'cancel') isCancelled = true;
  });
}

(async () => {
  let wuResult, wuid='';
  try {
    if(workerData.jobType == 'Spray') {
      let sprayJobExecution = await hpccUtil.executeSprayJob({
        cluster_id: workerData.clusterId, 
        sprayedFileScope: workerData.sprayedFileScope,
        sprayFileName: workerData.sprayFileName,
        sprayDropZone: workerData.sprayDropZone
      });
      wuid = sprayJobExecution.SprayResponse && sprayJobExecution.SprayResponse.Wuid ? sprayJobExecution.SprayResponse.Wuid : ''      
    } else {
      wuid = await hpccUtil.getJobWuidByName(workerData.clusterId, workerData.jobName);
      //record workflow execution
      workerData.status = 'submitted';
      let jobExecutionRecorded = await assetUtil.recordJobExecution(workerData, wuid); 
    }
    console.log(
    ` ${workerData.jobName} ` +
    `(WU: ${wuid}) to url ${workerData.clusterId}/WsWorkunits/WUResubmit.json?ver_=1.78`
    );
    let wuInfo = await hpccUtil.resubmitWU(workerData.clusterId, wuid);    
  } catch (err) {
    console.log(err);
  } finally {
    if (parentPort) {            
      console.log(`signaling done for ${workerData.jobName}`)
      parentPort.postMessage('done');      
      
    } else {
      process.exit(0);
    }
  }
})();