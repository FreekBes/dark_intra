/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   theme.js                                           :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2021/11/28 01:49:05 by fbes          #+#    #+#                 */
/*   Updated: 2021/12/01 19:20:27 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

var themeColorsLink = null;
var themeLink = null;

/**
 * Disable a theme, set theme or colors to false to not disable those colors
 */
function disableTheme(theme, colors) {
	if (theme !== false && themeLink) {
		themeLink.remove();
		themeLink = null;
	}
	if (colors !== false && themeColorsLink) {
		themeColorsLink.remove();
		themeColorsLink = null;
	}
}

/**
 * Enable a theme, leave colors as null or undefined to use default color scheme
 */
function enableTheme(theme, colors) {
	console.log("%c[Improved Intra]%c Enabling theme '" + theme + "'" + (colors ? " in '" + colors + "' mode..." : ""), "color: #00babc;", "");
	if (!themeLink) {
		themeLink = document.createElement("link");
		themeLink.setAttribute("type", "text/css");
		themeLink.setAttribute("rel", "stylesheet");
		document.getElementsByTagName("head")[0].appendChild(themeLink);
	}
	themeLink.setAttribute("href", chrome.runtime.getURL("css/theme-"+theme+".css"));

	if (colors && colors !== "default")
	{
		if (!themeColorsLink) {
			themeColorsLink = document.createElement("link");
			themeColorsLink.setAttribute("type", "text/css");
			themeColorsLink.setAttribute("rel", "stylesheet");
			document.getElementsByTagName("head")[0].appendChild(themeColorsLink);
		}
		themeColorsLink.setAttribute("href", chrome.runtime.getURL("css/colors-"+colors+".css"));
	}
	else {
		disableTheme(false, true);
	}
}

function checkThemeSetting() {
	chrome.storage.local.get(["theme", "colors"], function(data) {
		if (data["theme"] == "system") {
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
			enableTheme("system", null);
		}
	});
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
	console.log("%c[Improved Intra]%c @media rule prefers-color-scheme changed", "color: #00babc;", "");
	checkThemeSetting();
});

checkThemeSetting();