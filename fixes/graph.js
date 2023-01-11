/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   graph.js                                           :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2022/12/14 17:21:33 by fbes          #+#    #+#                 */
/*   Updated: 2023/01/11 15:48:29 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

function addMoreCursuses() {
	const cursuses = [
		{ id: 1, name: "42" },
		{ id: 3, name: "Discovery Piscine" },
		{ id: 4, name: "Piscine C" },
		{ id: 6, name: "Piscine C décloisonnée" },
		{ id: 7, name: "Piscine C à distance" },
		{ id: 9, name: "C Piscine" },
		{ id: 10, name: "Formation Pole Emploi" },
		{ id: 11, name: "Bootcamp" },
		{ id: 12, name: "Créa" },
		{ id: 13, name: "42 Labs" },
		{ id: 21, name: "42cursus" },
		{ id: 53, name: "42.zip" },
	];

	const cursusSwitcher = document.querySelector('#graph_cursus');
	const availableCursuses = [...cursusSwitcher.children].map(opt => parseInt(opt.getAttribute('value')));

	cursuses.forEach(cursus => {
		if (availableCursuses.indexOf(cursus.id) !== -1) {
			return;
		}

		const option = document.createElement('option');
		option.textContent = `${cursus.name} (Improved Intra)`;
		option.setAttribute('value', cursus.id.toString());
		cursusSwitcher.appendChild(option);
	});
}


/* ************************************************************************** */
/*                                                                            */
/*                               GALAXY GRAPH                                 */
/*                     A replacement for 42's Holy Graph                      */
/*                                                                            */
/*           The GalaxyGraph submodule used for this functionality            */
/*                     is licensed under the MIT License                      */
/*            Copyright (c) 2022 de la Hamette Leon Jean Laurenti             */
/*                   https://github.com/W2Wizard/GalaxyGraph                  */
/*                                                                            */
/*                                                                            */
/*                  Included into Improved Intra by Freek Bes                 */
/*                          with the help of W2Wizard                         */
/*                                                                            */
/* ************************************************************************** */

function translateToGalaxyGraph(data) {
	iConsole.log("[GalaxyGraph] Translating Holy Graph data to GalaxyGraph data...", data);

	const graphData = [];

	for (const project of data) {
		try {
			const isModule = project["name"].toLowerCase().includes("module");
			const isFinalModule = project["name"].endsWith("08"); // CPP only!
			const iGraphProject = {
				state: project["state"],
				final_mark: project["final_mark"],
				kind: (isModule ? (isFinalModule ? "final_module" : "module") : project["kind"]),
				name: project["name"],
				x: project["x"] - 2999,
				y: project["y"] - 2999,
				duration: project["duration"],
				requirements: project["rules"],
				description: project["description"],
				url: window.location.origin + "/projects/" + project["slug"],
				lines: []
			};
			for (const by of project["by"]) {
				const line = {
					source: {
						x: by["points"][0][0] - 2999,
						y: by["points"][0][1] - 2999,
					},
					target: {
						x: by["points"][1][0] - 2999,
						y: by["points"][1][1] - 2999,
					}
				};
				iGraphProject.lines.push(line);
			}
			graphData.push(iGraphProject);
		}
		catch (err) {
			iConsole.error("[GalaxyGraph] Could not translate Holy Graph data to GalaxyGraph data for project", err, project);
		}
	}

	iConsole.log("[GalaxyGraph] Translated Holy Graph data to GalaxyGraph data!", graphData);
	return (graphData);
}

let galaxyGraphFetchAbortController = null;
function fetchGalaxyGraphData(cursusId, campusId, login) {
	// Get logged in user. If it's the same as the user we're fetching data for, use localStorage for cache, otherwise use sessionStorage
	const userMenuLoginSpan = document.querySelector(".main-navbar span[data-login]");
	const loggedInUser = (userMenuLoginSpan ? userMenuLoginSpan.getAttribute("data-login") : "_"); // Fallback to _ if we can't find the user menu, so that everything is stored in sessionStorage
	const cacheStorage = (loggedInUser == login ? localStorage : sessionStorage);
	iConsole.log("[GalaxyGraph] Using " + (loggedInUser == login ? "localStorage" : "sessionStorage") + " for cache storage");

	// Fetch cached data
	const cachedStorageData = cacheStorage.getItem(`galaxy-graph-${cursusId}-${campusId}-${login}`);
	let cachedData = null;
	if (cachedStorageData) {
		try {
			cachedData = JSON.parse(cachedStorageData);
		}
		catch (err) {
			iConsole.error("[GalaxyGraph] Could not parse cached graph data", err);
		}
	}

	// Return the cached data (or null) and a promise that resolves with the latest data
	return [cachedData, new Promise( async (resolve, reject) => {
		if (galaxyGraphFetchAbortController) {
			iConsole.log("[GalaxyGraph] Another data fetch is already in progress, aborting this request...");
			galaxyGraphFetchAbortController.abort();
		}

		// Fetch new data
		galaxyGraphLoadingElement.classList.add("active");
		galaxyGraphFetchAbortController = new AbortController();
		fetch(`https://projects.intra.42.fr/project_data.json?cursus_id=${cursusId}&campus_id=${campusId}&login=${login}`, { signal: galaxyGraphFetchAbortController.signal })
			.then(response => response.json())
			.then(async data => {
				try {
					// WARNING: You don't want to work with the code below. It is ugly as f*ck. But it works. Magically.
					// It is a workaround for the fact that 42's API doesn't return the whole holy graph data for some reason.
					// Part of it is hardcoded in a file called "hack.js" - we need to fetch this data somehow, to apply it to the Galaxy Graph.
					// The way it works is as follows:
					// - It calls a function to dispatch a custom event to an injected script
					// - So that this injected script can call a function defined in the window object to some data
					// - The injected script then dispatches a custom event with the data back to us
					// - We wait for this event to occur in a promise and set a variable's contents to this return value
					// - And then we patch the data with the hardcoded holy graph data
					// Honestly, 42 should start adding this hardcoded shit to the API instead, so we only need to rely on the API

					const hardcodedData = await new Promise((hcRes, hcRej) => {
						// Event Listener to wait for the return value of the injected script below
						window.addEventListener("hardcoded-holy-graph-shit-ret", function(ev) {
							iConsole.log("[GalaxyGraph] Hardcoded holy graph data:", ev.detail.projects);
							hcRes(ev.detail.projects);
						});
						window.addEventListener("hardcoded-holy-graph-shit-err", function(ev) {
							hcRej(ev.detail.error);
						});

						// Get the hardcoded holy graph data from the window object
						// We need to do this in an injected script because the window object is not available to us here
						applyHolyGraphHardCodedShit(data, cursusId);
					});

					// Translation for inner project kinds to GalaxyGraph kinds
					const kindTranslations = {
						"inner_solo": "project",
						"inner_linked": "project",
						"inner_big": "big_project",
						"inner_satellite": "module",
						"inner_planet": "final_module",
						"inner_exam": "exam"
					}

					// Apply the hardcoded data to the actual data, but only what we wish to keep
					data.forEach(project => {
						if (data["id"] in hardcodedData) {
							project["x"] = hardcodedData[project["id"]]["x"];
							project["y"] = hardcodedData[project["id"]]["y"];
							project["by"] = hardcodedData[project["id"]]["by"];
							if (hardcodedData[project["id"]]["kind"] in kindTranslations) {
								project["kind"] = kindTranslations[hardcodedData[project["id"]]["kind"]];
							}
						}
					});

					return (data);
				}
				catch (e) {
					iConsole.warn("[GalaxyGraph] Could not apply hardcoded shit to Galaxy Graph data. Using default API data instead. Error:", e);
					return(data);
				}
			})
			.then(data => translateToGalaxyGraph(data))
			.then(graphData => {
				// Update cache
				cacheStorage.setItem(`galaxy-graph-${cursusId}-${campusId}-${login}`, JSON.stringify(graphData));
				resolve(graphData);

				// Remove the loading indicator and clear the abort controller
				galaxyGraphFetchAbortController = null;
				galaxyGraphLoadingElement.classList.remove("active");
			})
			.catch(err => {
				reject(err);
				// If the request was not aborted, remove the loading indicator and clear the abort controller
				if (err.name !== "AbortError") {
					galaxyGraphFetchAbortController = null;
					galaxyGraphLoadingElement.classList.remove("active");
				}
			});
	})];
}

function resizeGalaxyGraph(iframe) {
	if (!iframe) {
		iframe = document.getElementById("galaxy-graph-iframe");
	}
	const headerHeight = document.querySelector(".main-navbar").offsetHeight;
	iframe.setAttribute("height", (window.innerHeight - headerHeight) + "px");
	// const sidebarWidth = document.querySelector(".page-sidebar").offsetWidth;
	// iframe.setAttribute("width", (document.body.offsetWidth - sidebarWidth) + "px");
	// const pageContentWidth = document.querySelector(".page-content").offsetWidth;
	iframe.setAttribute("width", "100%");
}

let removalInterval = null;
function removeHolyGraph(holyGraphContainer) {
	for (const child of holyGraphContainer.children) {
		if (!child.getAttribute("id") || child.getAttribute("id").indexOf("galaxy-graph-") != 0) {
			child.remove();
		}
	}
}

function replaceHolyGraph() {
	const pageContent = document.querySelector(".page-content");
	if (pageContent) {
		const holyGraphContainer = pageContent.querySelector(".row .row"); // yes, twice...
		if (holyGraphContainer) {
			// Fetch the cursuses available for this Holy Graph
			const cursusSelect = holyGraphContainer.querySelector("#graph_cursus");
			const cursi = [];
			for (const option of cursusSelect.children) {
				cursi.push({
					id: option.getAttribute("value"),
					name: option.innerText,
				});
			}

			// Fetch the campus available for this Holy Graph
			const campusInput = holyGraphContainer.querySelector("#graph_campus");
			const campusId = campusInput.value;

			// Remove all children in the current holy graph
			removeHolyGraph(holyGraphContainer);
			removalInterval = setInterval(() => {
				removeHolyGraph(holyGraphContainer);
			}, 50);
			setTimeout(() => {
				clearInterval(removalInterval);
			}, 2000);

			// Remove the negative margin from the row
			holyGraphContainer.style.marginLeft = "0px";
			holyGraphContainer.style.marginRight = "0px";

			// Add our own iframe with the GalaxyGraph
			holyGraphContainer.style.position = "relative";
			const iframe = document.createElement("iframe");
			iframe.setAttribute("id", "galaxy-graph-iframe");
			resizeGalaxyGraph(iframe);
			iframe.style.border = "none";

			// Add a loading element to the container which is displayed while fetching the Holy Graph data from the Intranet
			galaxyGraphLoadingElement = document.createElement("div");
			galaxyGraphLoadingElement.setAttribute("id", "galaxy-graph-loading");
			galaxyGraphLoadingElement.setAttribute("class", "active");
			galaxyGraphLoadingElement.innerText = "Fetching the latest data from Intra...";
			holyGraphContainer.appendChild(galaxyGraphLoadingElement);

			// Make sure the iframe is resized when it is loaded
			// This is because a scrollbar will get added to the top window
			iframe.addEventListener("load", function() {
				resizeGalaxyGraph();
				iframe.contentWindow.postMessage({
					type: "init_data",
					cursi: cursi,
					campi: [
						{
							id: parseInt(campusId),
							name: campusId.toString()
						}
					]
				}, '*');
			});

			// Set the source to the GalaxyGraph page, hosted in the extension
			iframe.src = chrome.runtime.getURL("fixes/galaxygraph/www/index.html?noCache=" + Date.now());

			// Append the iframe to the holy graph container
			holyGraphContainer.appendChild(iframe);

			// Resize the iframe on window resize
			window.addEventListener("resize", function() {
				resizeGalaxyGraph();
			});

			// Add event listener for communication with the iframe
			window.addEventListener("message", async function(event) {
				switch (event.data.type) {
					case "graph_data":
						iConsole.log("[GalaxyGraph] Received request for graph data!", event.data);
						const urlParams = new URLSearchParams(window.location.search);
						const galaxyGraphData = fetchGalaxyGraphData(event.data.cursus_id, event.data.campus_id, urlParams.get("login"));
						if (galaxyGraphData[0]) {
							iConsole.log("[GalaxyGraph] Sending cached GalaxyGraph data while waiting for Intra to respond with latest data...")
							iframe.contentWindow.postMessage({
								type: "graph_data",
								graph: {
									ranks: [ "in_progress", "in_progress", "in_progress", "in_progress", "in_progress", "in_progress" ],
									projects: galaxyGraphData[0]
								}
							}, '*');
						}
						galaxyGraphData[1].then(graphData => {
							iConsole.log("[GalaxyGraph] Latest graph data received from Intra, sending to GalaxyGraph...");
							iframe.contentWindow.postMessage({
								type: "graph_data",
								graph: {
									ranks: [ "in_progress", "in_progress", "in_progress", "in_progress", "in_progress", "in_progress" ],
									projects: graphData
								}
							}, '*');
						}).catch(err => {
							if (err.name != "AbortError") {
								iConsole.error("[GalaxyGraph] Error while fetching graph data: " + err);
							}
						});
						break;
					case "project_link_click":
						window.location.href = event.data.href;
						break;
					case "error":
						iConsole.error("[GalaxyGraph] " + event.data.message);
						break;
					case "warning":
						iConsole.warn("[GalaxyGraph] " + event.data.message);
						break;
					default:
						iConsole.warn("[GalaxyGraph] Unknown message type received from GalaxyGraph iframe: ", event.data);
						break;
				}
			});
		}
		else {
			iConsole.warn("[GalaxyGraph] Could not find the '.page-content .row .row' element to replace the Holy Graph in");
		}
	}
	else {
		iConsole.warn("[GalaxyGraph] Could not find the page-content element to replace the Holy Graph in");
	}
}

function setPageHolyGraphImprovements() {
	improvedStorage.get("holygraph-morecursuses").then(function(data) {
		if (optionIsActive(data, "holygraph-morecursuses")) {
			addMoreCursuses();
		}
	});

	// TODO: add option
	replaceHolyGraph();
}
