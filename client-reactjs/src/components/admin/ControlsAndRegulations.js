import React, { Component } from "react";
import { Table, Button, Row, Col, Modal, Form, Input, notification, Spin, Select, Popconfirm, Tooltip, Divider } from 'antd/lib';
import BreadCrumbs from "../common/BreadCrumbs";
import { authHeader, handleError } from "../common/AuthHeader.js"
import AddRegulations from "./AddRegulations";
import { DeleteOutlined, EditOutlined, QuestionCircleOutlined, ShareAltOutlined  } from '@ant-design/icons';

const Option = Select.Option;

class Regulations extends Component {
  state = {
  	regulations:[],
  	selectedRegulation:[],
    initialDataLoading: false,
    dataTypeSelectedRowKeys:'',
    dataTypeDetails:[],
    openAddRegulationDialog:false,
    compliance:""
  }

  componentDidMount() {
  	this.getRegulations();
  }

  getRegulations() {
   this.setState({
      initialDataLoading: true
    });
  	fetch(process.env.REACT_APP_PROXY_URL + "/api/controlsAndRegulations/controlsAndRegulations", {
      headers: authHeader()
    })
	.then((response) => {
    if(response.ok) {
      return response.json();
    }
    handleError(response);
	})
	.then(data => {
	    this.setState({
	    	regulations: data
        });
      this.setState({
         initialDataLoading: false
       });

  	})
  	.catch(error => {
    	console.log(error);
  	});
  }

  handleDelete = (compliance) => {
    var data = JSON.stringify({compliance:compliance});
    console.log(data);
  fetch(process.env.REACT_APP_PROXY_URL + "/api/controlsAndRegulations/delete", {
    method: 'post',
    headers: authHeader(),
    body: data
   }).then((response) => {
      if(response.ok) {
        return response.json();
      }
      handleError(response);
   })
   .then(suggestions => {
      notification.open({
          message: 'Controls and Regualtion Removed',
          description: 'The Controls and Regualtion has been removed.',
          onClick: () => {
            console.log('Closed!');
          },
        });
       this.getRegulations();
   }).catch(error => {
     console.log(error);
   });
  }

  handleEdit(compliance) {
    fetch(process.env.REACT_APP_PROXY_URL + "/api/controlsAndRegulations/getRegulation?compliance="+compliance, {
        headers: authHeader()
    })
    .then((response) => {
      if(response.ok) {
        return response.json();
      }
      handleError(response);
    })
	  .then(data => {
      this.setState({
        selectedRegulation:data,
        openAddRegulationDialog: true,
        compliance:compliance
      });
    })
  	.catch(error => {
    	console.log(error);
  	});
  }

  handleAdd = (event) => {
  	this.setState({
      selectedRegulation:[],
      compliance:"",
      openAddRegulationDialog: true
    });
  }

   handleClose = () => {
        this.getRegulations();
        this.setState({
            openAddRegulationDialog: false
        });
      }
  render() {

  	const Columns = [{
      title: 'Compliance',
      dataIndex: 'compliance',
      width: '20%'
    },
    {
      title: 'Data Types',
      dataIndex: 'data_types',
      width: '60%'
    },
    {
      width: '20%',
      title: 'Action',
      dataIndex: '',
      render: (text, record) =>
        <span>
          <a href="#" onClick={(row) => this.handleEdit(record.compliance)}><Tooltip placement="right" title={"Edit"}><EditOutlined /></Tooltip></a>
          <Divider type="vertical" />
          <Popconfirm title="Are you sure you want to delete?" onConfirm={() => this.handleDelete(record.compliance)} icon={<QuestionCircleOutlined />}>
            <a href="#"><Tooltip placement="right" title={"Delete"}><DeleteOutlined /></Tooltip></a>
          </Popconfirm>
        </span>
    }];

    return (
    <React.Fragment>
      <div className="d-flex justify-content-end">
        <BreadCrumbs applicationId={this.state.applicationId}/>
        <span style={{ marginLeft: "auto" }}>
          <Tooltip placement="bottom" title={"Click to add a new User"}>
            <Button className="btn btn-secondary btn-sm" onClick={() => this.handleAdd()}><i className="fa fa-plus"></i> Add Controls and Regulations</Button>
          </Tooltip>
        </span>
      </div>
      <div className="loader">
        <Spin spinning={this.state.initialDataLoading} size="large" />
      </div>
      <div style={{padding:"15px"}}>
      	<Table
          columns={Columns}
          rowKey={record => record.id}
          pagination={{ pageSize: 20 }}
          dataSource={this.state.regulations}/>
      </div>

      <div>
     {this.state.openAddRegulationDialog ?
          <AddRegulations
            compliance={this.state.compliance}
            selectedRegulation={this.state.selectedRegulation}
            regulations={this.state.regulations}
            onClose={this.handleClose}/> : null}
      </div>
   </React.Fragment>
    );  }
}

export default Regulations;