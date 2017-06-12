self.addEventListener("message", gotMessageFn)

function gotMessageFn(event){
	// console.log("From Main Thread-->", event.data);

	// var count = 1000 * 1
	// count = 1000 * event.data.multiplier;

	setTimeout(function(){ postMessage(event.data) }, 1)
}

