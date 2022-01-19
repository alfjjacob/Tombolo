import React, { useState } from 'react'
import { useEffect, useRef } from 'react';
import { authHeader, handleError } from "../../common/AuthHeader.js";
import '@antv/x6-react-shape';
import { message } from 'antd';
import { debounce } from "lodash";

import Event from '../Graph/Event';
import Canvas from '../Graph/Canvas';
import Stencil from '../Graph/Stencil';
import Keyboard from '../Graph/Keyboard';
import { useDispatch, useSelector } from 'react-redux';

import AssetDetailsDialog from "../AssetDetailsDialog"
import ExistingAssetListDialog from "./ExistingAssetListDialog";
import SubProcessDialog from "./SubProcessDialog";


const defaultState= {
    openDialog: false,
    subProcessId: "",
    assetId: "",
    title: "",
    type: "",
    id: "",
    cell: null,
    nodes:[], // ?? not sure if needed
    edges:[], // ?? not sure if needed
}

function GraphX6() {
  const graphContainerRef = useRef();
  const stencilContainerRef = useRef();
  const graphRef = useRef();
  const {applicationId, applicationTitle, dataflowId, user} = useSelector(state => state.dataflowReducer);
 
  const [configDialog, setConfigDialog] = useState({...defaultState});

const dispatch = useDispatch();

  useEffect(() => {
    const graph = Canvas.init(graphContainerRef.current);
    graphRef.current= graph;
    Stencil.init(stencilContainerRef.current, graph);
    // Event.init(graph, graphContainerRef);
    Keyboard.init(graph);

    // get saved graph
    (async () => {
        try {
          const response = await fetch(`/api/dataflowgraph?application_id=${applicationId}&dataflowId=${dataflowId}`, { headers: authHeader(), });
          if (!response.ok) handleError(response);
          const data = await response.json();

          if (data) {
            // Nodes and Edges comes as a string, need to parse it to object
            const nodes = data.nodes ? JSON.parse(data.nodes) : [];
            const edges = data.edges ? JSON.parse(data.edges) : [];
            console.log('-nodes-----------------------------------------');
            console.dir({nodes}, { depth: null });
            console.log('------------------------------------------');
            
            nodes.forEach((node) => {
              graph.addNode({
                id: node.id,
                x: node.x,
                y: node.y,
                shape: 'custom-shape',
                data: {
                  type: node.type,
                  title: node.title,
                  assetId: node.assetId,
                  subProcessId: node.subProcessId,
                },
              });
            });
      
            edges.forEach((edge) => {
              graph.addEdge({ source: edge.source, target: edge.target});
            });
          }

        } catch (error) {
          console.log(error);
          message.error('Could not download graph nodes');
        }
    })();

    console.log(`Graph`, graph);

      graph.on('node:mouseenter', ({ node }) => {
        // Show visible ports
        const ports = graphContainerRef.current.querySelectorAll('.x6-port-body');
        ports.forEach(port => (port.style.visibility = 'visible'));
        // add a remove button
        node.addTools([
          {
            name: 'button-remove',
     
          },
          {
            name: 'button',
            args: {
              x: '100%',
              y: 3,
              markup: [
                // {
                //   tagName: 'path',
                //   selector: 'graph-icon-hide',
                //   attrs: {
                //     d: 'M942.2 486.2Q889.47 375.11 816.7 305l-50.88 50.88C807.31 395.53 843.45 447.4 874.7 512 791.5 684.2 673.4 766 512 766q-72.67 0-133.87-22.38L323 798.75Q408 838 512 838q288.3 0 430.2-300.3a60.29 60.29 0 000-51.5zm-63.57-320.64L836 122.88a8 8 0 00-11.32 0L715.31 232.2Q624.86 186 512 186q-288.3 0-430.2 300.3a60.3 60.3 0 000 51.5q56.69 119.4 136.5 191.41L112.48 835a8 8 0 000 11.31L155.17 889a8 8 0 0011.31 0l712.15-712.12a8 8 0 000-11.32zM149.3 512C232.6 339.8 350.7 258 512 258c54.54 0 104.13 9.36 149.12 28.39l-70.3 70.3a176 176 0 00-238.13 238.13l-83.42 83.42C223.1 637.49 183.3 582.28 149.3 512zm246.7 0a112.11 112.11 0 01146.2-106.69L401.31 546.2A112 112 0 01396 512z" /><path d="M508 624c-3.46 0-6.87-.16-10.25-.47l-52.82 52.82a176.09 176.09 0 00227.42-227.42l-52.82 52.82c.31 3.38.47 6.79.47 10.25a111.94 111.94 0 01-112 112z',
                //     "graph-icon-hide":{
                //     }
                //   },
                // },
                {
                  tagName: 'text',
                  textContent: 'Hide',
                  selector: 'icon',
                  attrs: {
                    fill: '#fe854f',
                    textAnchor: 'middle',
                    cursor: 'pointer',
                    fontSize: '13px',
                  },
                },
              ],
              onClick({ cell }) {
                console.log('hello');
              },
            },
          },
        ]);
      });
  
      graph.on('node:mouseleave', ({ node }) => {
        // hide visible ports
        const ports = graphContainerRef.current.querySelectorAll('.x6-port-body');
        ports.forEach(port => (port.style.visibility = 'hidden'));
        // hide remove button
        node.removeTools();
      });
  
      graph.on('edge:mouseenter', ({ edge }) => {
        //add a remove button to edge
        edge.addTools({ name: 'button-remove', args: { distance: -40 } });
      });
  
      graph.on('edge:mouseleave', ({ edge }) => {
        //hide a remove button
        edge.removeTools();
      });

      graph.on('node:dblclick', ({node, cell}) => {
        const nodeData = node.store.data.data;
        const nodes = graph.getNodes();
        const edges = graph.getEdges();
        setConfigDialog(()=>({...nodeData, openDialog: true, cell, nodes, edges}))
      })  

      graph.history.on('change', ( { cmds, options }) => { 
        if (cmds[0].event === 'cell:change:tools') return; // ignoring hover events
        
        const actions = ['dnd',"resize","mouse","remove",'add-edge','add-asset'];
        if(actions.includes(options?.name)){
          handleSave(graph)
          console.log(`saved`)
        }
        
        // console.log('-cmds, options-----------------------------------------');
        // console.dir({cmds, options}, { depth: null });
        // console.log('------------------------------------------');
        
      })
  }, []);

  const handleSave = debounce(async (graph) => {
    const nodes = graph.getNodes().map((node) => {
      const nodeData = node.store.data.data;         
      return {
        id: node.id,
        x: node.getPosition().x,
        y: node.getPosition().y,
        ...nodeData,
      };
    });
  
    const edges = graph.getEdges().map((edge) => ({
      source: edge.getSourceCellId(),
      target: edge.getTargetCellId(),
    }));
  
    try {
      const options = {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ nodes, edges, application_id: applicationId, dataflowId }),
      };
  
      const response = await fetch('/api/dataflowgraph/save', options);
      if (!response.ok) handleError(response);
  
      const data = await response.json();
      console.log('------------------------------------------');
      console.log('Graph saved');
      console.dir({ data }, { depth: null });
      console.log('------------------------------------------');
    } catch (error) {
      console.log(error);
      message.error('Could not save graph');
    }
  }, 1000);
  

  const onAssetAdded = async (selectedAsset) => {
    const cell = configDialog.cell
    
    cell.updateData({
        title: selectedAsset.title,
        assetId: selectedAsset.id,
        subProcessId: selectedAsset.jobType === 'Sub-Process' ? selectedAsset.id : undefined
    }, { name:'add-asset' }) // HISTORY EVENT LISTENER WILL SAVE NEW GRAPH NODES TO DB IF 'add-asset' is triggered

    try {
      const options = {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ assetId: selectedAsset.id, dataflowId })
      }

      const response = await fetch('/api/dataflow/saveAsset', options);
      if (!response.ok) handleError(response);

      // const jobtypes = ['Job','Modeling','Scoring','ETL','Query Build','Data Profile'];
      // if (configDialog.type === "Job" && jobtypes.includes(selectedAsset.jobType)){
      //   const options={
      //     method: 'POST',
      //     headers: authHeader(),
      //     body: JSON.stringify({
      //       currentlyEditingId: configDialog.id,
      //       application_id: applicationId,
      //       jobId: selectedAsset.id,
      //       mousePosition: "", //  !! we dont track that
      //       dataflowId
      //     })
      //   }
      //   const response = await fetch('/api/job/createFileRelation',options);
      //   if (!response.ok) handleError(response);
      //   console.log(`Saved file relationship...`);
      //   //refresh
      // }
    } catch (error) {
      console.log(error);
      message.error('Could not download graph nodes');
    }

    setConfigDialog({...defaultState})
  }

  const handleClose = (record) =>{
    if (record) {
      onAssetAdded(record)
    } else {
      setConfigDialog({...defaultState})
    }
  }

  return (
    <>
      <div id="container">
        <div id="stencil" ref={stencilContainerRef} />
        <div id="graph-container" ref={graphContainerRef} />
      </div>

       {configDialog.openDialog && configDialog.assetId ?
        <AssetDetailsDialog 
          selectedJobType={ configDialog.type }
          selectedAsset={{ id: configDialog.assetId }} 
          selectedDataflow={{ id: dataflowId }}
          selectedNodeId={configDialog.id}
          selectedNodeTitle={configDialog.title}
          nodes={configDialog.nodes}
          edges={configDialog.edges}
          handleClose={handleClose}
          onAssetSaved={()=> console.log(`saved`)}
        />
        : null } 

        {configDialog.openDialog && !configDialog.assetId ?
          <ExistingAssetListDialog
            assetType={configDialog.type}
            currentlyEditingNodeId={configDialog.id}  
            show={configDialog.openDialog}
            handleClose={handleClose}
            dataflowId={dataflowId}
            applicationId={applicationId}
          /> 
         : null}  

      {/* {graphState.showSubProcessDetails ?         
          <SubProcessDialog
            show={graphState.showSubProcessDetails}
            applicationId={applicationId}
            selectedParentDataflow={selectedDataflow}
            onRefresh={onFileAdded}
            selectedSubProcess={graphState.selectedSubProcess}
            nodeId={graphState.currentlyEditingNode.id}/> : null} */}
    </>
  );
}

export default GraphX6;