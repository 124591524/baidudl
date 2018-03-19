function Extractor(file)
{
    var self = this;

    self.getHLinks = function(){
        self.__getHLinks__(function(hlinks){
            self.__filterHLinks__(hlinks, function(filtered){
                page.fileList.updateHLinks(filtered);
                updatePopup();
            });
        });
    };
    // update server list in config
    self.__updateServers__ = function(hlinks, cb){
        var new_servers = hlinks.map(function(e){
            return new URL(e).host;
        });
        var additional = new_servers.filter(function(item){
            return config.servers.indexOf(item) < 0;
        });
        config.servers = config.servers.concat(additional);
        chrome.storage.local.set({'config': config});
        cb(config.servers);
    };
    self.__getHLinks__ = function(cb){
        var parsed_glink = self.parsed_glink;

        // if not login, use configured server list to create hlink list
        if(!page.bduss){
            var hlinks = config.servers.map(function(e){
                parsed_glink.host = e;
                parsed_glink.protocol = 'http';
                return self.parsed_glink.href;
            });
            self.hlinks = hlinks;
            return cb(hlinks);
        }

        // if logged in, grab hlink list
        var pathnames = parsed_glink.pathname.split('/');
        var url = 'https://d.pcs.baidu.com/rest/2.0/pcs/file?time='+parsed_glink.searchParams.get('time')+'&version=2.2.0&vip=1&path='+pathnames[pathnames.length-1]+'&fid='+parsed_glink.searchParams.get('fid')+'&rt=sh&sign='+parsed_glink.searchParams.get('sign')+'&expires=8h&chkv=1&method=locatedownload&app_id=250528&esl=0&ver=4.0';
        $.ajax({
            url: url,
            dataType: 'json',
            success: function(res){
                // error handling
                if(res.error_code && res.error_code != 0){
                    new Error(res.error_code).handle();
                    return;
                }

                console.log('Get hlink list success');

                // create hlink list and update server list
                var hlinks = res.urls.map(function(e){
                    return e.url;
                });
                self.hlinks = hlinks;
                self.__updateServers__(hlinks, function(servers){
                    var hlinks = servers.map(function(e){
                        parsed_glink.host = e;
                        parsed_glink.protocol = 'http';
                        return self.parsed_glink.href;
                    });
                    self.hlinks = hlinks;
                    return cb(hlinks);
                });
            }
        });
    };
    self.__filterHLinks__ = function(hlinks, cb){

        // rule out useless hlinks by header testing to exploit a race condition bug(or feature?)
        // TODO: need to add normal hlinks
        var filtered = [];
        var promises = hlinks.map(function(e, i){
            var promise = $.ajax({
                url: e,
                type: 'HEAD',
                timeout: 3000,
                success: function(res, status, request){
                    if(request.getResponseHeader('Content-MD5')){
                        filtered[i] = e;
                    }
                }
            });
            return promise;
        });
        Q.allSettled(promises).then(function(res){
            filtered = filtered.filter(function(e){
                if(e)return true;
            });
            cb(filtered);
        });
    };

    self.__init__ = function(file){
        self.parsed_glink = new URL(file.glink);
    };
    self.__init__(file);
}

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details){
        var headers = details.requestHeaders;
		var index = -1;
		for(var i=0; i<headers.length; i++){
			if(headers[i].name == 'Cookie'){
				index = i;
				break;
			}
		}
		if(index >= 0){
			headers.splice(index, 1);
		}
		return {'requestHeaders': headers};
	},
    {urls: ["*://pan.baidu.com/api/sharedownload*", "*://pan.baidu.com/api/download*"]},
    ['blocking', 'requestHeaders']
);