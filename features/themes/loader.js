/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   loader.js                                          :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2021/11/28 01:49:05 by fbes          #+#    #+#                 */
/*   Updated: 2024/01/17 20:25:16 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

// let themeColorsLink = null;
//let themeLink = null;

let themeLink = () => {
	let raw = document.getElementById("#improved_intra__themelink");
	if (raw === null)
	{
		raw = document.createElement("link");
		raw.setAttribute("type", "text/css");
		raw.setAttribute("rel", "stylesheet");
		document.head.appendChild(raw);
	}
	return (raw);
};

let themeColorsLink = () => {
	let raw = document.getElementById("#improved_intra__themecolorslink");
	if (raw === null)
	{
		raw = document.createElement("link");
		raw.setAttribute("type", "text/css");
		raw.setAttribute("rel", "stylesheet");
		document.head.appendChild(raw);
	}
	return (raw);
}


// Disable a theme, set theme or colors to false to not disable those colors
function disableTheme(theme, colors) {
	if (theme !== false) {
		themeLink().remove();
	}
	if (colors !== false) {
		themeColorsLink.remove();
		reColorizeLogTimeChart();
	}
}

// Enable a theme, leave colors as null or undefined to use default color scheme
function enableTheme(theme, colors) {
	iConsole.log("Enabling theme '" + theme + "'" + (colors ? " in '" + colors + "' mode..." : ""));
	themeLink().setAttribute("href", chrome.runtime.getURL("features/themes/"+theme+".css"));
	if (colors && colors !== "default") {
		themeColorsLink().setAttribute("href", chrome.runtime.getURL("features/themes/colors/"+colors+".css"));
		setTimeout(function() {
			reColorizeLogTimeChart();
		}, 100);
	}
	else {
		disableTheme(false, true);
	}
}

function checkThemeSetting() {
	improvedStorage.get(["theme", "colors"]).then(function(data) {
		if (data["theme"] == "system" || !data["theme"]) {
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				enableTheme("dark", data["colors"]);
			}
			else {
				enableTheme("light", data["colors"]);
			}
		}
		else if (data["theme"]) {
			enableTheme(data["theme"], data["colors"]);
		}
		else {
			// fallback to default
			enableTheme("light", null);
		}
	});
}

function reColorizeLogTimeChart() {
	const ltSvg = document.getElementById("user-locations");
	if (!ltSvg) {
		return;
	}
	const days = ltSvg.getElementsByTagName("g"); // Fetch all days
	for (let i = 0; i < days.length; i++) {
		const rect = days[i].querySelector("rect");
		if (!rect) { // Skip if no rect found in the added element
			continue;
		}
		const fill = rect.getAttribute("fill");
		if (fill.indexOf("rgba") > -1) {
			const col24hex = getComputedStyle(document.documentElement).getPropertyValue('--theme-color'); // using theme color, not 24h color (24h color is for text)
			if (col24hex !== "") {
				const col24rgb = hexToRgb(col24hex.trim());
				const opacity = fill.replace(/^.*,(.+)\)/, '$1');
				rect.setAttribute("fill", "rgba("+col24rgb.r+","+col24rgb.g+","+col24rgb.b+","+opacity+")");
			}
		}
	}
}


// colorize logtimes chart based on selected color scheme
// use MutationObserver to identify when the SVG chart is loaded
function colorizeNewLogTimeDays() {
	const ltSvg = document.getElementById("user-locations");
	if (!ltSvg) {
		return;
	}
	const observer = new MutationObserver(function(mutationsList, observer) {
		for (let mutation of mutationsList) {
			if (mutation.type == "childList") {
				const nodes = mutation.addedNodes;
				for (let i = 0; i < nodes.length; i++) {
					if (nodes[i].nodeType !== 1) { // Skip if not an element node
						continue;
					}
					const rect = nodes[i].querySelector("rect");
					if (!rect) { // Skip if no rect found in the added element
						continue;
					}
					const fill = rect.getAttribute("fill");
					if (fill.indexOf("rgba") > -1) {
						const col24hex = getComputedStyle(document.documentElement).getPropertyValue('--theme-color'); // using theme color, not 24h color (24h color is for text)
						if (col24hex !== "") {
							const col24rgb = hexToRgb(col24hex.trim());
							const opacity = fill.replace(/^.*,(.+)\)/, '$1');
							rect.setAttribute("fill", "rgba("+col24rgb.r+","+col24rgb.g+","+col24rgb.b+","+opacity+")");
						}
					}
				}
			}
		}
	});
	observer.observe(ltSvg, { childList: true });
	// TODO: maybe disconnect the observer somehow after data for the chart is loaded?
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
	iConsole.log("@media rule prefers-color-scheme changed");
	checkThemeSetting();
});

window.addEventListener("DOMContentLoaded", () => checkThemeSetting());

// fix sign in page issue with background image
window.addEventListener("DOMContentLoaded", function() {
	if (window.location.origin.indexOf("intra.42.fr") > -1 && window.location.pathname == "/users/sign_in") {
		document.getElementsByTagName("html")[0].setAttribute("style", "background-color: unset !important;");
	}
});
