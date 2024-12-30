class ClassWatcher {

    constructor(targetNode, classToWatch, classAddedCallback) {
        this.targetNode = targetNode
        this.classToWatch = classToWatch
        this.classAddedCallback = classAddedCallback
        this.observer = null
        this.lastClassState = targetNode.classList.contains(this.classToWatch)

        this.init()
    }

    init() {
        this.observer = new MutationObserver(this.mutationCallback)
        this.observe()
    }

    observe() {
        this.observer.observe(this.targetNode, { attributes: true })
    }

    disconnect() {
        this.observer.disconnect()
    }

    mutationCallback = mutationsList => {
        for(let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                let currentClassState = mutation.target.classList.contains(this.classToWatch)
                if(this.lastClassState !== currentClassState) {
                    this.lastClassState = currentClassState
                    if(currentClassState) {
                        this.classAddedCallback()
                    }
                }
            }
        }
    }
}

const formatDate = (date, intervalSecs) => {
	const parsedDate = Date.parse(date.replace("at ", ""));
	const formated = `${
		new Date(parsedDate).toISOString().replace(/-|:|\.\d\d\d/g,"")
	}/${
		new Date(parsedDate + intervalSecs * 1000).toISOString().replace(/-|:|\.\d\d\d/g,"")
	}`;
	return (formated);
} 

const handleModalOpen = () => {
	const header = document.querySelector("#smartModal > div > div > div.modal-header");
	const aside = header.querySelector("aside");
	const calendar = aside.querySelector("span:nth-child(1)");
	const name = header.querySelector("div > h4").textContent;
	const date = header.querySelector("div > small").textContent;
	const loc = document.querySelector("span.event-location.event-meta-item > span:nth-child(2)").textContent;
	calendar.setAttribute("class", "google-calendar-link");
	calendar.setAttribute("title", "Add event to Google Calendar");
	calendar.addEventListener("click", () => window.open(
		`http://www.google.com/calendar/render?action=TEMPLATE&text=${name}&dates=${formatDate(date, 3600)}
			&location=${loc}&trp=false"`,
		"_blank"
	));
}

if (window.location.pathname == "/") {
	const modal = document.getElementById("smartModal");
	if (modal) {
		new ClassWatcher(modal, "in", handleModalOpen);
	}
}