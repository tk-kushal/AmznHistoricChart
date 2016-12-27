// ==UserScript==
// @name           Historic Price Shopper
// ==/UserScript==

http://stackoverflow.com/a/5947280/277601
(function(amznhc, $, undefined) {

	// http://stackoverflow.com/a/24649134/277601
	// Avoid recursive frame insertion...
	// var extensionOrigin = 'chrome-extension://' + chrome.runtime.id;
	// if (!location.ancestorOrigins.contains(extensionOrigin)) {
	// 	pingForFakespotData();
	// }

	/** Get latest details from Fakespot
	 *   Status will be:
	 *     NONE - Ping again in 3 seconds
	 *     BAD - Do not continue
	 *     WAITING_FOR_PAGE_GENERATION - Ping again in 3 seconds
	 *     ANALYZING - Ping again in 3 seconds
	 *     NOT_ENOUGH_REVIEWS - Do not continue
	 *     DONE - Do not continue, should have product/company grade and Trustwerty rating
	 * */
	function pingForFakespotData(){
		chrome.runtime.sendMessage({
			method: 'GET',
			action: 'fakespot_xhttp',
			url: "https://" + window.location.hostname + window.location.pathname
		}, function(result) {
			console.log("Got fakespot data back: " + result.productGrade + " - " + result.companyGrade + " - " + result.twStars);
			console.log("   Returned status: " + result.status);
			
			switch(result.status){
				case amazonfs.StatusEnum.WAITING_FOR_PAGE_GENERATION:
					console.log("Status:WAITING_FOR_PAGE_GENERATION");
					UpdateFakespotDetails(result);
					// Wait 3 seconds
					setTimeout(pingForFakespotData, 3000);
					break;
				case amazonfs.StatusEnum.ANALYZING:
					console.log("Status:ANALYZING - " + result.analysisPercent + "%  " + result.analysisNotes);
					UpdateFakespotDetails(result);
					// Wait 3 seconds
					setTimeout(pingForFakespotData, 3000);
					break;
				case amazonfs.StatusEnum.NOT_ENOUGH_REVIEWS:
					console.log("Status:NOT_ENOUGH_REVIEWS");
					UpdateFakespotDetails(result);
					break;
				case amazonfs.StatusEnum.DONE:
					console.log("Status:DONE " + result.productGrade + " - " + result.companyGrade +
						" - " + result.twStars + " - AGE: " + result.analysisAge);
					UpdateFakespotDetails(result);
					break;
				case amazonfs.StatusEnum.BAD:
					console.log("Status:BAD");
					break;
				case amazonfs.StatusEnum.NONE:
				default:
					// Wait 3 seconds
					setTimeout(pingForFakespotData, 3000);
					break;
			}
		});
	}

	function UpdateFakespotDetails(result){
		// TODO:
		// Create element if it doesn't exist, below the graph
		// 
		switch(result.status){
			case amazonfs.StatusEnum.WAITING_FOR_PAGE_GENERATION:
				break;
			case amazonfs.StatusEnum.ANALYZING:
				break;
			case amazonfs.StatusEnum.NOT_ENOUGH_REVIEWS:
				break;
			case amazonfs.StatusEnum.DONE:
				break;
			default:
				// Do nothing
				break;
		}
		// iframe of frame.html
		// var iframe = document.createElement('iframe');
		// // Must be declared at web_accessible_resources in manifest.json
		// iframe.src = chrome.runtime.getURL('frame.html');
		// 
		// // Some styles for a fancy sidebar
		// iframe.style.cssText = 'position:fixed;top:0;left:0;display:block;' +
		//                        'width:300px;height:100%;z-index:1000;';
		// // document.body.appendChild(iframe);
	
		// iframe of responseText
		// var iframe = document.createElement('iframe');
		// iframe.srcdoc = this.responseText;
		// iframe.src = "data:text/html;charset=utf-8," + escape(this.responseText);
		// // iframe.style.cssText = 'position:fixed;top:0;left:0;display:block;' +
		// //                        'width:300px;height:100%;z-index:1000;';
		// document.body.appendChild(iframe);
		// alert(responseText);
	}

	function isAlreadyAdded(elementName){
	  var element = document.getElementById(elementName);
	  return element != null;
	}

	function removeElement(elementName) {
	  var element = document.getElementById(elementName);
	  if (element && element.parentElement)
		element.parentElement.removeChild(element);
	}

	function removeElementList(elementName) {
	  var list = document.getElementByClassName(elementName);
	  for (var i = list.length - 1; 0 <= i; i--)
		if(list[i] && list[i].parentElement)
		  list[i].parentElement.removeChild(list[i]);
	}

	var nwtcr_domAdditionsCount = 0;
	/**
	 * Waits until DOM changes have stopped before adding our modifications to the website.
	 * When user changes product size/color/variant, parts of the page get deleted or recreated.
	 * For this case, we wait until all changes have finished, then try adding our modifications
	 * back in.
	 *  - Wait some more if changes have happened recently
	 *  - Wait some more if, after trying to add our modifications, they do not exist anymore
	 * */
	function onDomChange2(){
		if (nwtcr_domAdditionsCount > 0){
			nwtcr_domAdditionsCount = 0;
			setTimeout(function(){onDomChange2();}, 500);	
		} else {
			amznhc.addAmazonPriceGraph();
			if (isAlreadyAdded('MyMiniCamelChart')){
				document.documentElement.removeEventListener('DOMNodeInsertedIntoDocument', countDocAdditions, false);
			} else {
				setTimeout(function(){onDomChange2();}, 1000);	
			}
		}
	};

	/**
	 * Counts number of times nodes have been inserted into the document.
	 * We are tracking this because we don't want to add our charts back in while page
	 * is still getting created.
	 * */
	function countDocAdditions(){
		nwtcr_domAdditionsCount += 1;
	};

	/**
	 * When the CamelCamelCamel's ancestor node is removed from page, cleanup and remove 
	 * all modifications we've made (makes it easier when adding them back in).
	 * It is also important to get new images since the same product with a different
	 * color/size will have a different CamelCamelCamel chart.
	 * */
	function onCamelRemove(){ 
		var element = document.getElementById('MyMiniCamelChart');
		if (element != null) {
			element.id = 'MyMiniCamelChartRemoved';
		}
		removeElement('MyCamelChart');
		removeElement('MyCamelSalesRankChart');
		nwtcr_domAdditionsCount = 0;
		
		document.documentElement.addEventListener('DOMNodeInsertedIntoDocument', countDocAdditions, false);
		setTimeout(function(){onDomChange2();}, 500);	
	};

	/**
	 * Adds a link to page, as a child of a parent (with a specific Id, ClassName, or TagName)
	 * */
	function addLink(url, text, domNodeOptions) {
	  var element;
	  if (domNodeOptions.getBy == "id") {
		element = document.getElementById(domNodeOptions.parentId);
	  } else if (domNodeOptions.getBy == "class") {
		var elements = document.getElementsByClassName(domNodeOptions.parentId);
		if (elements.length == 0) return false;
		element = elements[0];
	  } else if (domNodeOptions.getBy == "tag") {
		var elements = document.getElementsByTagName(domNodeOptions.parentId);
		if (elements.length == 0) return false;
		element = elements[0];
	  }
	  if (element == null) return false;

	  var span = document.createElement('span');
	  span.setAttribute('style', 'font-size : x-small');
	  span.innerHTML = text;

	  var label = document.createElement('a');
	  label.setAttribute('class', 'nav_a');
	  label.setAttribute('href', url);
	  label.setAttribute('rel', 'noreferrer');
	  label.appendChild(span);
	  //console.log("found " + parentId);
	  element.insertBefore(label, element.firstChild);
	  //element.insertBefore(document.createElement('br'), element.firstChild);
	  return true;
	}

	/**
	 * Adds CamelCamelCamel image (linking to CamelCamelCamel).
	 * Also adds listener, DOMNodeRemovedFromDocument, as the AddToCart gets regenerated whenever
	 * customer selects a different color/size/variant within the same product. When this happens,
	 * our modifications get removed, so we wait for a delay following the removal, and add them
	 * back in.
	 * */
	function addLinkImg(url, imgUrl, imgTitle, divName, width, height, domNodeOptions) {
	  var element;
	  var siblingToPlaceBefore;
	  if (domNodeOptions.getBy == "id") {
		element = document.getElementById(domNodeOptions.parentId);
	  } else if (domNodeOptions.getBy == "class") {
		var elements = document.getElementsByClassName(domNodeOptions.parentId);
		if (elements.length == 0) return false;
		element = elements[0];
	  } else if (domNodeOptions.getBy == "tag") {
		var elements = document.getElementsByTagName(domNodeOptions.parentId);
		if (elements.length == 0) return false;
		element = elements[0];
	  }
	  if (element == null) return false;
	  if (domNodeOptions.afterSiblingNotAsChild) {
		  siblingToPlaceBefore = element.nextSibling;
		  if (element != null) 
			  element = element.parentNode;
		  if (element == null) return false;
	  } else {
		  siblingToPlaceBefore = element.firstChild;
	  }

	  var div = document.createElement('div');
	  div.setAttribute('id', divName);
	  
	  var label = document.createElement('a');
	  label.setAttribute('class', 'nav_a');
	  label.setAttribute('href', url);
	  label.setAttribute('rel', 'noreferrer');
	  
	  var img = document.createElement('img');
	  img.setAttribute('src', imgUrl);
	  img.setAttribute('alt', imgTitle); // Alt if image does not exist
	  img.setAttribute('title', imgTitle); // Title should make hover text
	  img.setAttribute('width', width);
	  img.setAttribute('height', height);

	  if (domNodeOptions.addTitle) {
		  var span = document.createElement('span');
		  span.setAttribute('style', 'font-size : large; color : #9933ff;');
		  span.innerHTML = imgTitle;

		  div.appendChild(span);
		  div.appendChild(document.createElement('br'));
	  }
	  div.appendChild(label);
	  div.appendChild(document.createElement('br'));
	  div.appendChild(document.createElement('br'));
	  label.appendChild(img);
	  //console.log("found " + domNodeOptions.parentId);
	  if (domNodeOptions.afterSiblingNotAsChild)
		  element.insertBefore(div, siblingToPlaceBefore);
	  else
		  element.insertBefore(div, siblingToPlaceBefore);
	  
	  if (domNodeOptions.addListener) div.addEventListener('DOMNodeRemovedFromDocument', onCamelRemove, false);

	  return true;
	}

	/**
	 * Gets the product ASIN (i.e. B01MRZIY0P)
	 * It tries to find it by first searching for Id named ASIN or asin,
	 * and then it tries the current page's URL: http://.*amazon.com.*?\/([A-Z0-9]{10})\/
	 * */
	function getASIN() {
		var ASIN = "";
		var asinElement = document.getElementById('ASIN');
		var asinElement2 = document.getElementById('asin');
		if (asinElement != null && asinElement.value != null && asinElement.value != ""){
			ASIN = asinElement.value;
		} else if (asinElement2 != null && asinElement2.value != null && asinElement2.value != ""){
			ASIN = asinElement2.value;
		} else if ((m = window.location.href.match(/\/([A-Z0-9]{10})(?:[/?]|$)/)) != null) {
			// The ASIN was found
			ASIN = m[1];
		}
		return ASIN;
	}

	/**
	 * Adds CamelCamelCamel graph and Fakespot results to Amazon webpage.
	 * */
	amznhc.addAmazonPriceGraph = function() {
		// Check if it's already added:
		if (isAlreadyAdded('MyMiniCamelChart')) {return;}
		
		// Get current ASIN & domain
		var amzTLD = "", ASIN = "", amzPre = "www.", m;
		if ((m = window.location.href.match(/((?:[a-zA-Z0-9_]+\.)?)amazon\.([a-z\.]+)\//)) != null) {
			amzPre = m[1];
			amzTLD = m[2];
			if (amzTLD == "co.jp") amzTLD = "jp";
			if (amzTLD == "at") amzTLD = "de";
		}
		
		ASIN = getASIN();


		if (amzTLD != null && ASIN != null) {
			// Clicking on this link will provide a larger historical image inside the same Amazon window
			var strNewALink = encodeURI("http://" + amzPre + "amazon." + amzTLD + "/gp/product/" + ASIN + "/?ie=UTF8&showcamellargegraph=1");
			// After the larger historical price window (inside Amazon) is up, clicking on the image again will take you
			// to CamelCamelCamel.com
			var strCamelLink = encodeURI("http://camelcamelcamel.com/product/" + ASIN);
			var strCamelSalesRankLink = encodeURI("http://camelcamelcamel.com/product/" + ASIN + "?active=sales_rank");
			var imgSmallLoc = encodeURI("http://charts.camelcamelcamel.com/us/" + ASIN + "/amazon.png?force=1&zero=0&w=350&h=300&desired=false&legend=1&ilt=1&tp=all&fo=0&lang=en");
			var imgLargeLoc = encodeURI("http://charts.camelcamelcamel.com/us/" + ASIN + "/amazon.png?force=1&zero=0&w=500&h=400&desired=false&legend=1&ilt=1&tp=all&fo=0&lang=en");
			var imgLargeSalesRankLoc = encodeURI("http://charts.camelcamelcamel.com/us/" + ASIN + "/sales-rank.png?force=1&zero=0&w=500&h=250&legend=1&ilt=1&tp=all&fo=0&lang=en");

			// Decide which link to add:
			var res;
			if ((m = window.location.href.match(new RegExp("\\&showcamellargegraph=1\\b"))) != null) {
				// Different sections of Amazon have different html, and so I need to
				// try to add the Historical Data to multiple locations (once one works, quit)
				
				// Note, the ordering is important in below, search in that priority
				// Page example: Electric shavers (which was once http://www.amazon.com/gp/product/B003YJAZZ4 )
				//    This should NOT use title_feature_div, since it has a css max-height:55px. Instead, put it at the same level but just AFTER
				
				/*	var domNodeOptionsForLargeSalesRankGraph = [];
				 *	domNodeOptionsForLargeSalesRankGraph.push(
				 *		{"afterSiblingNotAsChild":true,  "parentId":'title_feature_div',         "getBy":"id"},
				 *		{"afterSiblingNotAsChild":false, "parentId":'title_feature_div',         "getBy":"id"},
				 *		{"afterSiblingNotAsChild":false, "parentId":'product-title_feature_div', "getBy":"id"},
				 *		{"afterSiblingNotAsChild":false, "parentId":'title_row',                 "getBy":"id"},
				 *		{"afterSiblingNotAsChild":false, "parentId":'title',                     "getBy":"id"},
				 *		{"afterSiblingNotAsChild":false, "parentId":'parseasinTitle',            "getBy":"class"}
				 *		);
				 *	// Camel Historic Sales Rank graphs -- Do not enable until we add settings page
				 *	for (var i = 0; i < domNodeOptionsForLargeSalesRankGraph.length; i++){
				 *		domNodeOptionsForLargeSalesRankGraph[i].addListener = false;
				 *		domNodeOptionsForLargeSalesRankGraph[i].addTitle    = true;
				 *		console.info("Camel Historic Sales Rank graphs - trying " + domNodeOptionsForLargeSalesRankGraph[i].parentId);
				 *		// Wait for settings page before adding sales rank
				 *		res = addLinkImg(strCamelSalesRankLink, imgLargeSalesRankLoc, "Historical Sales Rank",
				 *				'MyCamelSalesRankChart', 500, 250, domNodeOptionsForLargeSalesRankGraph[i]);
				 *		if (res) break;
				 *	}
				 * */
				
				var domNodeOptionsForLargeCamelGraph = [];
				domNodeOptionsForLargeCamelGraph.push(
					{"afterSiblingNotAsChild":true,  "parentId":'title_feature_div',         "getBy":"id"},
					{"afterSiblingNotAsChild":false, "parentId":'title_feature_div',         "getBy":"id"},
					{"afterSiblingNotAsChild":false, "parentId":'product-title_feature_div', "getBy":"id"},
					{"afterSiblingNotAsChild":false, "parentId":'title_row',                 "getBy":"id"},
					{"afterSiblingNotAsChild":false, "parentId":'title',                     "getBy":"id"},
					{"afterSiblingNotAsChild":false, "parentId":'parseasinTitle',            "getBy":"class"}
					);
				
				// Camel Historic price graph
				for (var i = 0; i < domNodeOptionsForLargeCamelGraph.length; i++){
					domNodeOptionsForLargeCamelGraph[i].addListener = false;
					domNodeOptionsForLargeCamelGraph[i].addTitle    = false;
					console.info("Camel Large Historic price graph - trying " + domNodeOptionsForLargeCamelGraph[i].parentId);
					res = addLinkImg(strCamelLink, imgLargeLoc, "HistoricPriceShopper - Click to go to CamelCamelCamel",
							'MyCamelChart', 500, 400, domNodeOptionsForLargeCamelGraph[i]);
					if (res) break;
				}
			}

			var domNodeOptionsForCamelLink = [];
			domNodeOptionsForCamelLink.push(
				{"parentId":'buybox',              "getBy":"id"},
				{"parentId":'buy-box_feature_div', "getBy":"id"},
				{"parentId":'dmusic_buy_box',      "getBy":"id"},
				{"parentId":'buy',                 "getBy":"class"},
				{"parentId":'buying',              "getBy":"class"},
				// These should be a last-check since it puts it in wrong spot for other pages like http://www.amazon.com/gp/product/B00U3FPN4U
				{"parentId":'price_feature_div',   "getBy":"id"},
				// Page example: Baby K'tan Original Baby Carrier amazon.com/dp/B00FSKX266
				{"parentId":'buybox_feature_div',  "getBy":"id"},
				{"parentId":'buybox',              "getBy":"data-feature-name"}
				);
			finished = false;
			// Camel goto-link
			// Different sections of Amazon have different html, and so I need to
			// try to add the Historical Data to multiple locations (once one works, quit)
			for (var i = 0; i < domNodeOptionsForCamelLink.length; i++){
				console.info("Camel link - trying " + domNodeOptionsForCamelLink[i].parentId);
				res = addLink(strCamelLink, "Track at CamelCamelCamel", domNodeOptionsForCamelLink[i]);
				if (res) break;
			}
			
			var domNodeOptionsForMiniCamelGraph = [];
			domNodeOptionsForMiniCamelGraph.push(
				// Page example: Electric shavers (or deal of the day) (which was once http://www.amazon.com/gp/product/B003YJAZZ4 )
				//   This should NOT use buy-box_feature_div, since it doesn't seem to be created at the time the DOM is built :-/
				{"parentId":'buybox',              "getBy":"id"},
				{"parentId":'buy-box_feature_div', "getBy":"id"},
				{"parentId":'dmusic_buy_box',      "getBy":"id"},
				{"parentId":'buy',                 "getBy":"class"},
				{"parentId":'buying',              "getBy":"class"},
				//   These should be a last-check since it puts it in wrong spot for other pages like http://www.amazon.com/gp/product/B00U3FPN4U
				{"parentId":'price_feature_div',   "getBy":"id"},
				// Page example: Baby K'tan Original Baby Carrier amazon.com/dp/B00FSKX266
				{"parentId":'buybox_feature_div',  "getBy":"id"},
				{"parentId":'buybox',              "getBy":"data-feature-name"}
				);
			// Camel Historic price mini-graph
			for (var i = 0; i < domNodeOptionsForMiniCamelGraph.length; i++){
				domNodeOptionsForMiniCamelGraph[i].addListener            = true;
				domNodeOptionsForMiniCamelGraph[i].addTitle               = false;
				domNodeOptionsForMiniCamelGraph[i].afterSiblingNotAsChild = false;
				console.info("Camel Historic price mini-graph - trying " + domNodeOptionsForMiniCamelGraph[i].parentId);
				res = addLinkImg(strNewALink, imgSmallLoc, "Click to see larger image - HistoricPriceShopper",
						'MyMiniCamelChart', 175, 100, domNodeOptionsForMiniCamelGraph[i]);
				if (res) break;
			}
			
			// Add Fakespot results
			pingForFakespotData();
		} else {
			//console.log("Didn't find Amazon stuff");
		}
		
	}
	// Close namespace amznhc (http://stackoverflow.com/a/5947280/277601)
} ( window.amznhc = window.amznhc || {}, jQuery ));

amznhc.addAmazonPriceGraph();
