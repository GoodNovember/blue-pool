var myPool = new Pool("./worker.js");

console.log("POOL:", myPool);


var taskCount = 20;

var myTasks = [];

for(var i = 0; i < taskCount; i++){
	myTasks.push(myPool.request({msg:"Hello Friend! ["+(i+1)+"]", multiplier:i}));
}


console.time("Completion")

var allDone = Promise.all(myTasks);

var isCompleted = false;

allDone.then(function(resolution){
	// console.log("Resolved:", resolution);
	console.timeEnd("Completion")
	isCompleted = true;
	resolution.map(function(value){console.log("->", value)})
}).catch(function(errors){
	console.log("Error:", errors);
})

setTimeout(function() {
	if(!isCompleted){
		myPool.terminateAll("Timeout");
	}else{
		console.log('Completed before timeout.')
	}
}, 10000);