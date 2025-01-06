/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   logtimes.js                                        :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2022/04/05 22:04:27 by fbes          #+#    #+#                 */
/*   Updated: 2024/01/17 20:06:23 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

// calculates the background color based on the theme color and nb of hours
function addBackgroundToDays(ltDays) {
  for (let i = 0; i < ltDays.length; i++) {
    let originalTitle = ltDays[i].getAttribute("data-original-title");
    if (!originalTitle.includes("0h00")) {
      let rect = ltDays[i].getElementsByTagName("rect")[0];
      let alpha = Math.floor((parseFloat(originalTitle.split("h")[0]) / 24) * 255);
      if (alpha > 200) {
        alpha = 200;
      }
      alpha = alpha.toString(16);
      if (alpha.length < 2) {
        alpha = "0" + alpha;
      }
      rect.setAttribute("fill",
        getComputedStyle(rect).getPropertyValue("--theme-color")
        + alpha);
    }
  }
}

function getLogTimes(settings) {
	return new Promise(function(resolve, reject) {
		const httpReq = new XMLHttpRequest();
		httpReq.addEventListener("load", function() {
			try {
				resolve(JSON.parse(this.responseText));
			}
			catch (err) {
				reject(err);
			}
		});
		httpReq.addEventListener("error", function(err) {
			reject(err);
		});
		httpReq.withCredentials = true;
		httpReq.open("GET", window.location.origin.replace("profile", "translate") + "/users/" + getProfileUserName() + "/locations_stats.json");
		httpReq.send();
	});
}

// month logtime has to be calculated from the web since some days may be missing from the logtimes chart
function sumMonthLogTime(ltMonths, settings) {
	ltMonths = Array.from(ltMonths).reverse();
	getLogTimes(settings)
		.then(function(stats) {
			const dates = Object.keys(stats);
			const monthNames = [];
			const monthSums = [];
			for (let i = 0; i < ltMonths.length; i++) {
				monthNames.push(ltMonths[i].textContent);
				monthSums.push(0);
			}
			for (const date of dates) {
				const jsDate = new Date(date);
				const mIndex = monthNames.indexOf(jsDate.toDateString().split(" ")[1]);
				if (mIndex > -1) {
					monthSums[mIndex] += parseLogTime(stats[date]);
				}
			}
			const monthSumsUpdated = monthSums.map((val, idx)=>{
				if (idx >= (monthSums.length / 2)) {
					return (monthSums[idx - monthSums.length / 2]);
				}
				return (val);
			})
			for (let i = 0; i < ltMonths.length; i++) {
				const oldX = parseInt(ltMonths[i].getAttribute("x"));
				ltMonths[i].textContent = ltMonths[i].textContent + " (" + logTimeToString(monthSumsUpdated[i]) + ")";
				const newBbox = ltMonths[i].getBBox();
				// move element's x coordinate to the left to account for the width of the text added
				ltMonths[i].setAttribute("x", Math.round(oldX - newBbox.width * 0.5));
			}
		})
		.catch(function(err) {
			iConsole.error(err);
		});
}

function cumWeekLogTime(ltDays, settings) {
	let ltDay = ltDays[ltDays.length - 1];
	let daysInWeek = dayOfWeek + 1;
	const remainingWeeks = Math.floor(ltDays.length / 7) + (dayOfWeek != 6 ? 1 : 0);
	let r = 0;
	for (let i = 0; i < remainingWeeks; i++) {
		let j;

		if (i == 1) {
			daysInWeek = 7;
		}
		const tempLogTimes = [];

		// parse individual logtimes
		for (j = 0; j < daysInWeek; j++) {
			ltDay = ltDays[ltDays.length - r - 1];
			if (!ltDay) {
				return;
			}
			tempLogTimes.push(parseLogTime(ltDay.getAttribute("data-original-title")));
			if (tempLogTimes[j] == 0) {
				ltDay.setAttribute("data-nolog", "");
			}
			r++;
		}

		// calculate cumulative logtime
		for (j = daysInWeek - 2; j > -1; j--) {
			tempLogTimes[j] = tempLogTimes[j] + tempLogTimes[j + 1];
		}

		// add cumulative logtime to tooltips (and percentage if Codam Monit System enabled)
		for (j = daysInWeek - 1; j > -1; j--) {
			ltDay = ltDays[ltDays.length - r + j];
			if (!ltDay) {
				return;
			}
			ltDay.setAttribute("data-original-title", ltDay.getAttribute("data-original-title") + " (" + logTimeToString(tempLogTimes[daysInWeek - 1 - j]) + ")");
		}
	}
}

function notDuplicates(ltMonths) {
	if (ltMonths.length > 1) {
		arr = Array.from(ltMonths).map(val=>val.textContent).sort();
		return (arr[0] !== arr[1]);
	}
	return (false);
}

function fixFirstMonthOutOfBounds(ltSvg) {
	let viewBox = ltSvg.getAttribute("viewBox");
	if (viewBox) {
		const firstText = ltSvg.querySelector("text");
		viewBox = viewBox.split(" ").map(function(item) {
			return parseInt(item);
		});
		const monthsAmount = ltSvg.querySelectorAll("svg > text").length;
		const firstX = (firstText ? parseInt(firstText.getAttribute("x")) : 0);
		if (viewBox[0] > 0 && firstX < 150 && monthsAmount <= 4) {
			// Intra intents to shift months to the left when there's 5 months being displayed
			// however, the code that does that seems to contain some bugs, as sometimes it's also done when there's still only 4.
			// shift them back here, but only if the first month is displayed correctly (less than 150 pixels from the left side of the SVG)
			// and if there's 4 months being displayed instead of 5.
			iConsole.log("Logtimes chart viewBox seems off, first month might be hidden. Unhiding it by setting the first value to 0 (was "+viewBox[0]+", x="+firstX+").");
			viewBox[0] = 0;
			ltSvg.setAttribute("viewBox", viewBox.join(" "));
		}
	}
}

function addDateToAllDays(ltSvg, ltDays) {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	let month = 0;
	let date = 0;
	let year = 0;
	for (const day of ltDays) {
		if (day.previousElementSibling.nodeName.toUpperCase() == "TEXT") {
			month = months.indexOf(day.previousElementSibling.textContent.substring(0, 3)) + 1;
			if (today.getMonth() >= 0 && today.getMonth() < 6 && (month == 10 || month == 11 || month == 12)) {
				year = today.getFullYear() - 1;
			}
			else {
				year = today.getFullYear();
			}
			date = 1;
		}
		day.setAttribute("data-iidate", year.toString()+'-'+month.toString().padStart(2, '0')+'-'+date.toString().padStart(2, '0'));
		const dayOfWeek = new Date(year, month - 1, date).getDay();
		day.setAttribute("data-iiweekday", dayOfWeek == 0 ? 7 : dayOfWeek);
		date++;
	}
}

function localizeFirstDayOfWeek(ltSvg, ltDays) {
	// Check whether the first day of the week is Monday or Sunday from the user's locale
	// Fallback to "1" (Monday) if the weekInfo attribute is missing (e.g. in Firefox)
	const locale = new Intl.Locale(window.navigator.language);
	const firstDayOfWeek = "weekInfo" in locale && "firstDay" in locale.weekInfo ? locale.weekInfo.firstDay : 1;
	if (firstDayOfWeek == 7) {
		// Nothing to do here, the first day of the week is already Sunday
		return;
	}
	// First day of the week is not Sunday, assume it is Monday.
	// While other first days of the week might exist, they are not supported by this extension.
	for (const day of ltDays) {
		const dayWidth = parseInt(day.children[0].getAttribute("width"));
		if (day.getAttribute("data-iiweekday") == 7) {
			// Move Sunday to the end and up one week
			const dayHeight = parseInt(day.children[0].getAttribute("height"));
			day.setAttribute("transform", `translate(${dayWidth * 6}, -${dayHeight})`);
		}
		else {
			// Move every other day one to the left
			day.setAttribute("transform", `translate(-${dayWidth}, 0)`);
		}
	}
}

function applyLogTimeChartFixes(ltSvg, settings) {
	const ltDays = ltSvg.getElementsByTagName("g");
	const ltMonths = ltSvg.querySelectorAll("svg > text");

	// fix first month sometimes outside container
	fixFirstMonthOutOfBounds(ltSvg);

	// add date attribute to all days in svg
	// useful for Improved Intra but also other extensions!
	addDateToAllDays(ltSvg, ltDays);

	// localize first day of week
	localizeFirstDayOfWeek(ltSvg, ltDays);

	if (optionIsActive(settings, "logsum-month")) {
		sumMonthLogTime(ltMonths, settings);
	}
	if (optionIsActive(settings, "logsum-week")) {
		cumWeekLogTime(ltDays, settings);
	}

  // fill day background
  addBackgroundToDays(ltDays);
}

if (window.location.pathname == "/" || window.location.pathname.indexOf("/users/") == 0) {
	const ltSvg = document.getElementById("user-locations");
	if (ltSvg) { // check if logtimes chart is on page
		// wait until the logtimes chart is loaded before doing anything
		const observer = new MutationObserver(function(mutationsList, observer) {
			for (let mutation of mutationsList) {
				if (mutation.type == "childList" && mutation.removedNodes.length > 0) {
					// check if element with "user-locations-loading-overlay" was removed.
					// if so, the logtimes chart is loaded and we can continue
					for (let i = 0; i < mutation.removedNodes.length; i++) {
						if (mutation.removedNodes[i].id == "user-locations-loading-overlay") {
							improvedStorage.get(["logsum-month", "logsum-week"]).then(function(settings) {
								applyLogTimeChartFixes(ltSvg, settings);
							});
							observer.disconnect();
							break;
						}
					}
				}
			}
		});
		observer.observe(ltSvg.parentNode, { childList: true });
	}
}
