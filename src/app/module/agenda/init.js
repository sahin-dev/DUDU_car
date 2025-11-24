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

    init () {
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

    async start(){
        if(this.agenda){
            await this.agenda.start();
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
        this.agenda.cancel({ name: { $in: Object.keys(jobs) } });

        Object.keys(jobs).forEach(jobKey => {

             
  
            let  jobDetails = jobs[jobKey];
            this.agenda.define(jobKey, jobDetails.job);

            console.log("Registering job: ", jobKey, jobDetails);

            if(jobDetails.interval) {

                this.agenda.every(jobDetails.interval,jobKey);
            }

            console.log(`Agenda job registered: ${jobKey}`);
        })
    }

    

 }

module.exports =  new JobScheduler()