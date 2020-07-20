import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom';
import { Tabs } from 'antd/lib';
import { authHeader, handleError } from "../../common/AuthHeader.js"
import { useSelector, useDispatch } from "react-redux";
import DataflowAssetsTable from "./DataflowAssetsTable";
import {Graph} from "./Graph";
import BreadCrumbs from "../../common/BreadCrumbs";
const TabPane = Tabs.TabPane;

function DataflowDetails({props}) {
  const dataflowReducer = useSelector(state => state.dataflowReducer);
  console.log(dataflowReducer)
	return (
	  <React.Fragment>
	  <div>
        <div className="d-flex justify-content-end" style={{paddingTop: "60px"}}>
          <BreadCrumbs applicationId={dataflowReducer.applicationId} applicationTitle={dataflowReducer.applicationTitle}/>         
        </div>
        <div>
          <Tabs defaultActiveKey="1">
            <TabPane tab="Assets" key="1">    
              <DataflowAssetsTable applicationId={dataflowReducer.applicationId} selectedDataflow={dataflowReducer.dataflowId} user={dataflowReducer.user}/>
            </TabPane>
            <TabPane tab="Designer" key="2">    
              <Graph applicationId={dataflowReducer.applicationId} applicationTitle={dataflowReducer.applicationTitle} selectedDataflow={dataflowReducer.dataflowId} graphContainer="graph" sidebarContainer="sidebar"/>
            </TabPane>
          </Tabs>
        </div>
      </div>
     </React.Fragment>
	  )  

}

export default DataflowDetails