const {JSDOM} = require("jsdom");

const addSpansToText = (text, timings) => {
    let workingString = text;

    timings.forEach((timing, index) => {
        const indexOfLastBracket = workingString.lastIndexOf(">")
        const searchString = workingString.substring(indexOfLastBracket + 1)
        const updatedSearchString = searchString.replace(timing.text, `<span data-timing-index="${index}">${timing.text}</span>`)
        workingString = workingString.substring(0, indexOfLastBracket + 1) + updatedSearchString
    })

    return workingString
}

const addSpansToHtml = (html, timingsArr) => {
    console.log({html})
    const jsdom = new JSDOM();
    const document = new jsdom.window.DOMParser().parseFromString(`<!DOCTYPE html><body>${html}</body>`, 'text/html')
    const treeWalker = document.createTreeWalker(document.body, 4, (node) => !node.parentElement.classList.contains('hide-from-tts'))

    const timings = timingsArr.entries()

    let timingEntry = timings.next().value
    let timingIndex = timingEntry[0]
    let currentTiming = timingEntry[1]

    let nodesToRemove = []

    while (treeWalker.nextNode()) {
        const currentNode = treeWalker.currentNode
        let workingNodeText = currentNode.data

        let textToWrap = currentTiming.text

        let textStringsToWrap = []

        const hasMatch = () => workingNodeText.indexOf(textToWrap) !== -1

        if (!hasMatch()) continue;

        while (workingNodeText && hasMatch()) {
            const indexAfter = workingNodeText.indexOf(textToWrap) + textToWrap.length
            const spaceAfter = workingNodeText[indexAfter] === " "

            textStringsToWrap.push({textToWrap, timingIndex, spaceAfter})

            workingNodeText = workingNodeText.slice(
                workingNodeText.indexOf(textToWrap) + textToWrap.length
            )

            timingEntry = timings.next().value

            if (timingEntry) {
                timingIndex = timingEntry[0]
                currentTiming = timingEntry[1]
                textToWrap = currentTiming.text
            } else {
                continue;
            }
        }

        if (textStringsToWrap.length > 0) {
            wrapTextInNode(currentNode, textStringsToWrap, document)
            nodesToRemove.push(currentNode)
        }
    }

    nodesToRemove.forEach(node => node.parentNode.removeChild(node))

    return document.body.innerHTML;
}

function wrapTextInNode(node, textStringsToWrap, document) {
    const parentElement = node.parentElement;

    for (const {textToWrap, timingIndex, spaceAfter} of textStringsToWrap) {
        const spanElement = document.createElement('span')
        spanElement.setAttribute('data-timing-index', timingIndex)
        spanElement.textContent = textToWrap
        parentElement.insertBefore(spanElement, node)
        if (spaceAfter) {
            const spaceNode = document.createTextNode(' ')
            parentElement.insertBefore(spaceNode, node)
        }

    }
}

module.exports = {addSpansToText, addSpansToHtml}