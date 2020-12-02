'use strict';
module.exports = (sequelize, DataTypes) => {
  const job = sequelize.define('job', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      autoIncrement: false
    },
    application_id: DataTypes.STRING,
    author: DataTypes.STRING,
    contact: DataTypes.STRING,
    description: DataTypes.TEXT,
    ecl: DataTypes.TEXT,
    entryBWR: DataTypes.STRING,
    gitRepo: DataTypes.STRING,
    jobType: DataTypes.STRING,
    title: DataTypes.STRING,
    name: DataTypes.STRING,
    dataflowId: DataTypes.UUIDV4
  }, {freezeTableName: true});
  job.associate = function(models) {
    job.hasMany(models.jobfile,{
      foreignKey:'job_id',
      onDelete: 'CASCADE',
      hooks: true
    });
    job.hasMany(models.jobparam,{
      foreignKey:'job_id',
      onDelete: 'CASCADE',
      hooks: true
    });
    job.belongsTo(models.dataflow);
    job.belongsTo(models.application, {
      foreignKey: 'application_id'
    });
  };
  return job;
};