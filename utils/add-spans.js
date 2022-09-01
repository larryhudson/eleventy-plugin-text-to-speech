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

    // JSDOM + createTreeWalker give us an iterator of all the text nodes in the document    
    const jsdom = new JSDOM();
    const document = new jsdom.window.DOMParser().parseFromString(`<!DOCTYPE html><body>${html}</body>`, 'text/html')
    const treeWalker = document.createTreeWalker(document.body, 4, (node) => !node.parentElement.classList.contains('hide-from-tts'))

    // Array.prototype.entries() gives us an iterator of all the timings
    const timings = timingsArr.entries()

    let timingEntry = timings.next()

    function hasMatch(str, substr) {
        return str.indexOf(substr) !== -1
    }

    // treeWalker.nextNode will be called at the end of this loop
    while (!timingEntry.done && treeWalker.nextNode()) {

        const currentNode = treeWalker.currentNode

        // if the current timing entry text isn't in the current node, continue to the next node
        if (!hasMatch(treeWalker.currentNode.data, timingEntry.value[1].text)) continue;

        // while the current node has the current timing text in it
        while (!timingEntry.done && hasMatch(currentNode.data, timingEntry.value[1].text)) {

            // if the match is not at the very start of the text node,
            // eg. if our text node was "(Hello)" and the timing text was "Hello", the index of the match would be 1.
            // insert a new text with the chars that come before the match.
            if (currentNode.data.indexOf(timingEntry.value[1].text) > 0) {
                let indexOfMatch = currentNode.data.indexOf(timingEntry.value[1].text)
                const beforeMatchNode = document.createTextNode(
                    currentNode.data.substring(0, indexOfMatch)
                )
                currentNode.parentElement.insertBefore(beforeMatchNode, currentNode)
                // then remove those chars from the node
                currentNode.data = currentNode.data.substring(indexOfMatch)
            }

            // now we create a new span element for our match
            const spanElement = document.createElement('span')
            spanElement.setAttribute('data-timing-index', timingEntry.value[0])
            spanElement.textContent = timingEntry.value[1].text

            // we insert it before the current node
            currentNode.parentElement.insertBefore(spanElement, currentNode)

            // we remove the match from the node text
            currentNode.data = currentNode.data.replace(timingEntry.value[1].text, '')

            // continue to the next timing
            timingEntry = timings.next()
        }
    }

    // return our new HTML
    return document.body.innerHTML;
}

module.exports = {addSpansToText, addSpansToHtml}