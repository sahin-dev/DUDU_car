const {Agenda} = require("agenda");
const config = require("../../../config");



class JobScheduler {

    constructor(){
        this.agenda = null

        try{
            this.init()
            this.agenda.on('ready', () => {
                this.registerJobs()
            });
            
        }catch(err){
            throw err
        }
        
    }

    init (){
        try{
            this.agenda = new Agenda({
                db: { address: config.database_url, collection: "agendaJobs" }
            });

            console.log(this.agenda ? "Agenda initialized": "Agenda initialization failed");

     
        }catch(err){
            console.log("Error initializing agenda: ", err.message);
            throw err
        }
        
    } 

    start(){
        if(this.agenda){
            this.agenda.start();
            console.log("Agenda started");
        }
        else {
            throw new Error("Agenda not initialized");
        }
    }  

    stop (){
        if(this.agenda){
            this.agenda.stop();
            console.log("Agenda stopped");
        }
        else {
            throw new Error("Agenda not initialized");
        }
    }

    registerJobs(){
        let jobs = require("./jobs");

        Object.keys(jobs).forEach(jobKey => {

            let  jobDetails = jobs[jobKey];
            this.agenda.define(jobKey, jobDetails.job);

            console.log("Registering job: ", jobKey, jobDetails);

            if(jobDetails.interval) {

                this.every(jobKey,jobDetails.interval, jobDetails.data || null);

            }else if (jobDetails.when) {

                this.schedule(jobKey, jobDetails.when, jobDetails.data || null);

            }else {

                this.run(jobKey, jobDetails.data || null);
            }

            console.log(`Agenda job registered: ${jobKey}`);
        })
    }

    schedule(jobName, when, data = {}, options = {}){

        if(this.agenda){
            this.agenda.schedule(when, jobName, data, options);
            console.log(`Agenda job scheduled: ${jobName} at ${when}`);
        }
        else {
            throw new Error("Agenda not initialized");
        }
    }

    every(jobName, interval, data = {}, options = {}){
        if(this.agenda){
            this.agenda.every(interval, jobName, data, options);
            console.log(`Agenda job set to run every ${interval}: ${jobName}`);
        }   
        else {
            throw new Error("Agenda not initialized");
        }
    }
    
    run(jobName, data, options = {}){
        if(this.agenda){
            this.agenda.now(jobName, data, options);
            console.log(`Agenda job added: ${jobName}`);
        }
        else {
            throw new Error("Agenda not initialized");
        }   
    }

 }




module.exports =  new JobScheduler()