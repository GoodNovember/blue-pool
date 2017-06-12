function Pool(filepath, userCount){

	var DEFAULT_WORKER_COUNT = 3;

	var self = this;

	var jobQueue = [];
	var workerPool = [];
	var deferredPromisesMap = {};

	var idStore = new uniqueID();

	function uniqueID(){

		var last = -1;
		var i = 0;

		this.get = function(){
			if(last === i){
				i++
			}
			last = i;
			return i;
		}
	}

	function JobPackage(data, ownership){
		var self = this;

		function init(){

			self.id = idStore.get();
			self.data = data;
			self.ownership = ownership;
			self.isResolved = false;

		} init();

	}

	function OfficeWorker(filepath){
		var self = this;

		var myWorker;

		var currentJobRejector;

		function init(){

			self.id = idStore.get();
			myWorker = new Worker(filepath);
			self.isWorking = false;
			self.activeTaskID = null;
			self.terminate = terminate;
			self.performJob = performJob;

		} init();

		function performJob(jobPackage){
			return new Promise(function(resolve, reject){

				currentJobRejector = reject;

				if(self.isWorking){
					var err = new Error("Is Already Working on Task ID: " + self.activeTaskID)
					reject(err)
				}else{
					self.isWorking = true;
					self.activeTaskID = jobPackage.id
					myWorker.onmessage = workerOnMessageFn(resolve, reject);
					myWorker.postMessage(jobPackage.data, jobPackage.ownership);
				}

			})
		}

		function terminate(reason){
		
			if (currentJobRejector){
				var message = "Worker " + self.id + " Terminated."

				if(self.isWorking){
					message += " Was working on job:" + self.activeTaskID + " at the time."
				}
				if(reason){
					message += " Reason given: " + reason;
				}
				currentJobRejector(reason);
			}
			myWorker.terminate();
		}

		function workerOnMessageFn(resolve, reject){
			return function(event){
				self.isWorking = false;
				self.activeTaskID = null;
				myWorker.onmessage = undefined;
				currentJobRejector = null;
				resolve(event.data);
			}
		}

	}

	function init(){

		var chosenCount = userCount || window.navigator.hardwareConcurrency || DEFAULT_WORKER_COUNT;

		for(var i = 0; i < chosenCount; i++){
			workerPool.push(new OfficeWorker(filepath));
		}

		self.request = request;
		self.terminateAll = terminateAll;
	} init();

	function getFreeWorker(){
		var output = null;
		for(var i = 0; i < workerPool.length; i++){
			var wrkr = workerPool[i];
			if(wrkr.isWorking === false){
				output = wrkr;
			}
		}
		return output;
	}

	function request(data, ownership){

		return new Promise(function(resolve, reject){

			var aWorker = getFreeWorker();

			var pkg = new JobPackage(data,ownership);

			if(aWorker){

				resolve(promiseWorkerWillFulfillJob(aWorker, pkg));

			}else{

				deferredPromisesMap[pkg.id] = {
					resolve:resolve,
					reject:reject,
				}

				jobQueue.push(pkg);

			}

		})

	}

	function promiseWorkerWillFulfillJob(worker, jobPkg){
		return new Promise(function(resolve, reject){
			var workerPromise = worker.performJob(jobPkg).then(function(stuff){
				// requestAnimationFrame(pulseMachine);
				pulseMachine();
				return stuff;
			});
			resolve(workerPromise);
		})
	}

	function pulseMachine(){
		var worker = getFreeWorker();
		var job = jobQueue.shift();
		var jobPromise = null;
		if(job){
			jobPromise = deferredPromisesMap[job.id];
			promiseWorkerWillFulfillJob(worker, job).then(function(response){
				jobPromise.resolve(response);
				delete deferredPromisesMap[job.id];
			}, function(error){
				jobPromise.reject(error);
				delete deferredPromisesMap[job.id];
			})
		}
	}

	function terminateAll(reason){
		workerPool.map(function(officeWorker){
			officeWorker.terminate(reason);
		})

		var deferredJobIds = Object.keys(deferredPromisesMap);

		for(var i = 0; i < deferredJobIds.length; i++ ){
			var jobID = deferredJobIds[i];
			var deferedPromise = deferredPromisesMap[jobID];
			deferedPromise.reject("User Terminated Action, Reason:" + reason);
		}

		workerPool = [];
		init();
	}

}