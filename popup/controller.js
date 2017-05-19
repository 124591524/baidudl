// initialize angular model
var app = angular.module('app', []);
app.controller('control', ['$scope', function($scope){
	$scope.message = 'pan.baidu.com only';
	$scope.status = false;
	
	// function to generate high speed link
	$scope.generate = function(i){
		$scope.message = "Running...";
		var x = $scope.links[i];
		var fs_id = x.fs_id;
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {fs_id: fs_id}, function(response) {
				$scope.$apply(function(){
					$scope.links[i].hlink = response;
					$scope.message = "Ready.";
				})
			});
		});
	}
	$scope.generateAll = function(){
		for(var i=0; i<$scope.links.length; i++)$scope.generate(i);
	}
	
	// create a hidden input for copy
	var body = angular.element(document.body);
	var textarea = angular.element('<input/>');
	textarea.css({
		position: 'fixed',
		opacity: '0'
	});
	body.append(textarea);
	
	// copy links to clipboard
	$scope.copy = function(i, type){
		if(type=='hlink')textarea.val($scope.links[i].hlink)
		else textarea.val($scope.links[i].dlink)
		if(!textarea.val()){
			$scope.message = "This field is empty"
			return
		}
		textarea[0].select()
		if(document.execCommand("copy"))$scope.message = "Copy success";
		else $scope.message = "Copy failure"
	}

}])

// add listener to handle received download links
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	var $scope = angular.element(document.getElementById('app')).scope();
	if(request.type == "passLinks"){
		$scope.$apply(function(){
			if(request.result.feedback != 'Success'){
				$scope.message = 'It\'s empty!';
			}else{
				$scope.links = request.result.links;
				$scope.status = true;
			}
		});
		sendResponse('Success');
	}
	if(request.type == "passNewLink"){
		var hlink = request.result;
		$scope.$apply(function(){
			$scope.links[i].hlink = hlink;
		})
	}
	if(request.type == "error"){
		$scope.$apply(function(){
			$scope.message = request.result;
		})
	}
})
// execute content script
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	var url = tabs[0].url;
	try{
		var domain = url.match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/)[1];
		console.log(domain);
		if(domain == 'pan.baidu.com'){
			var $scope = angular.element(document.getElementById('app')).scope();
			$scope.$apply(function(){$scope.message = "Ready."});
			chrome.tabs.sendMessage(tabs[0].id, {greeting: "yes"}, function(response) {
				if(!response){
					chrome.tabs.executeScript({file: "content_script/sandbox.js"});
				}else{
					chrome.tabs.executeScript({code: "reload_js(chrome.extension.getURL('/content_script/injection.js'))"});
				}
			})
		}
	}catch(err){
		console.log(err);
	}
});
