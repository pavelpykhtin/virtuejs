module.exports = (function () {
	return {
		clickHidden,
		doubleClickHidden
	};

	function clickHidden(selector) {
		return mouseAction(this, 'click', selector, arguments[arguments.length - 1]);
	}

	function doubleClickHidden(selector) {
		return mouseAction(this, 'dblclick', selector, arguments[arguments.length - 1]);
	}

	function mouseAction(client, eventName, selector, callback) {
		client
			.executeAsync(function (eventNameArg, selectorArg, done) {
				var event = new MouseEvent(
					eventNameArg,
					{
						view: window,
						bubbles: true,
						cancelable: true
					})
				document.querySelector(selectorArg)
					.dispatchEvent(event);

				done();
			}, eventName, selector)
			.call(callback);
	}
}());