import React, {useState, useEffect, useRef} from 'react'
import { Upload, Button , Modal, message} from 'antd';
import { ImportOutlined, InboxOutlined } from '@ant-design/icons';
import { authHeader } from "../common/AuthHeader.js";
import { applicationActions } from '../../redux/actions/Application';
import { store } from "../../redux/store/Store";
import { useHistory } from "react-router";



//<<<< Socket
import {io} from "socket.io-client";


//<<<< Dragger
const { Dragger } = Upload;



function ImportApplication(props) {
  const [ modalVisible, setModalVisiblity] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("")
  const [file, setFile] = useState({});
  const [importing, setImporting] = useState(false)
  const [ importUpdates, setImportUpdates] = useState([])
  const history = useHistory();
  const scrollToBottomRef = useRef(null);

  //Log color
  const logColor = (status) =>{
    if(status === "error"){
      return "#ff0000"
    }else if(status === "success"){
      return "#00ff00"
    }else{
      return "#FFFFFF"
    }
  }


  useEffect(() => {
    //Establish connection when  component loads
    const socket = io("http://localhost:3000", {
    transports: ["websocket"]
  });

  //When the connection is established
     socket.on("connect", () => {
      console.log("<<<< socket connection success ")
    })

    //When message is received from back end
    socket.on("message", (message) =>{
      setImportUpdates(existingMsgs => [...existingMsgs , JSON.parse(message)])
      console.log("<<<<<<<<<<<", importUpdates)
    })

    //Clean up when component unmounts
    // return function cleanup(){
    //   socket.close()
    //   console.log("<<<< Component unmouting ")
    // }
  }, [importUpdates])

  //Scroll logs to bottom
 const scrollLogs = () => {
  scrollToBottomRef.current?.scrollIntoView({behavior : "smooth"})
 }
 useEffect(() => {
  scrollLogs()
 }, [importUpdates])


  //message config
  message.config({ top: 150 });

  //Handle Import
  const handleImport = () => {
    setImporting(true);
    let formData = new FormData();
    formData.append("user", props.user.username);
    formData.append("file", file);
    
    fetch("/api/app/read/importApp", {
      method: 'post',
      headers: authHeader("importApp"),
      body: formData
    }).then((response) => response.json())
      .then(data => {
        console.log("<<<< Response Data", data)
        if(data.success){
          console.log("Import Success <<<<",data.message)
          message.success(data.message)
          setModalVisiblity(false)
          setFile({})
          setImporting(false)
          store.dispatch(applicationActions.applicationSelected(data.appId, data.appTitle));
          localStorage.setItem("activeProjectId", data.appTitle);

          history.push(`/${data.appId}/assets`);
        }else{
          console.log("<<<< import error", data.message)
          message.error(data.message)
          setModalVisiblity(false)
          setFile({})
          setImporting(false)
        }
      })
  }


  //Draggeer's props
  const propss = {
    name: 'file',
    multiple: false,
    onChange(info) {
      setUploadStatus("")
      const { status } = info.file;
      if (status !== 'uploading') {
        setUploadStatus(status)
        console.log("<<<< Uploading ...")
      }
      if (status === 'done') {
        setUploadStatus(status);
        console.log("<<<< antD dragger", info.file.originFileObj)
        setFile(info.file.originFileObj);
      } else if (status === 'error') {
        setUploadStatus(status)
        console.log("<<<< Error uploading")
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    }
  };


  //customRequest
  const customRequest = ({ onSuccess }) => {
      onSuccess("ok");
  };
    
    return (
        <div>
           <Button style={{display: "flex", placeItems : "center", marginRight: "10px"}} 
              className="btn btn-sm btn-primary" 
              onClick={() =>setModalVisiblity(true)}
              icon={<ImportOutlined  />}>Import App
            </Button>

            <Modal 
              title={importing ? null : "Import Application"}
              closable={!importing}
              visible={modalVisible} 
              onCancel={() => {setModalVisiblity(false); setUploadStatus("")}}
              footer={uploadStatus === "done" && !importing ? 
                      <Button className="btn-primary" 
                      onClick={ handleImport}
                      >Start Import</Button> 
                      : null}>
                        <br></br>
                <Dragger 
                maxCount={1}
                showUploadList={false}
                className="importApplication_dragger"
                style={{display : importing?"none":"block"}}
                {...propss}
                customRequest={customRequest}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    Data must be in JSON format
                  </p>
                  <p><b>{file?file.name:null}</b></p>
                
                </Dragger> 
                <div style={{background: "black", textAlign: "left", padding: "10px", height: "150px", overflow: "auto",  display: importing ? "block" : "none" }} >
                  {importUpdates.map(item => <div style={{textAlign: "left"}}><small style={{color: "white" }}>{item.message}</small></div>)}
                  <div ref={scrollToBottomRef}></div>
                </div>
               
               
            </Modal>
        </div>
    )
}

export default ImportApplication
