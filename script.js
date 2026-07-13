function toggleNews() {
    var moreNewsBtn = document.getElementById('moreNewsBtn');
    var lessNewsBtn = document.getElementById('lessNewsBtn');
    var newsList = document.querySelectorAll('.news ul li');
    if (!moreNewsBtn || !lessNewsBtn || newsList.length === 0) return;

    var isExpanded = (moreNewsBtn.style.display === 'none');
    for (var i = 5; i < newsList.length; i++) {
        newsList[i].style.display = isExpanded ? 'none' : '';
    }

    moreNewsBtn.style.display = isExpanded ? 'inline-flex' : 'none';
    lessNewsBtn.style.display = isExpanded ? 'none' : 'inline-flex';
}

window.addEventListener('load', function () {
    initHomepagePreviews();
    initNewsToggle();
    normalizePublicationMeta();
    initPaperFiltering();
});


function initHomepagePreviews() {
    syncHomepageNews();
    syncHomepagePublications();
}

function fetchPageDocument(url) {
    return fetch(url)
        .then(function (response) {
            if (!response.ok) throw new Error('Unable to load ' + url);
            return response.text();
        })
        .then(function (html) {
            return new DOMParser().parseFromString(html, 'text/html');
        });
}

function syncHomepageNews() {
    var preview = document.querySelector('.news-preview');
    if (!preview) return;
    var list = preview.querySelector('ul');
    if (!list) return;
    var fallbackNote = preview.querySelector('.preview-fallback-note');
    var source = preview.getAttribute('data-source') || './news.html';
    var count = Number(preview.getAttribute('data-preview-count') || 5);

    fetchPageDocument(source).then(function (doc) {
        var sourceItems = Array.from(doc.querySelectorAll('.news-full ul li')).slice(0, count);
        if (sourceItems.length === 0) return;
        list.innerHTML = '';
        sourceItems.forEach(function (item) {
            list.appendChild(document.importNode(item, true));
        });
        if (fallbackNote) fallbackNote.style.display = 'none';
    }).catch(function () {
        list.innerHTML = '<li class="preview-loading">Preview unavailable in this local view. Open through GitHub Pages or a local server.</li>';
        if (fallbackNote) fallbackNote.style.display = '';
    });
}

function syncHomepagePublications() {
    var preview = document.querySelector('.research-preview');
    if (!preview) return;
    var list = preview.querySelector('.dynamic-preview-list');
    var fallbackNote = preview.querySelector('.preview-fallback-note');
    var source = preview.getAttribute('data-source') || './publications.html';
    var count = Number(preview.getAttribute('data-preview-count') || 5);

    fetchPageDocument(source).then(function (doc) {
        var sourcePapers = Array.from(doc.querySelectorAll('.research-full .research-proj[data-select="True"]')).slice(0, count);
        if (sourcePapers.length === 0) return;

        if (list) list.innerHTML = '';
        sourcePapers.forEach(function (paper) {
            (list || preview).appendChild(document.importNode(paper, true));
        });
        normalizePublicationMeta();
        if (fallbackNote) fallbackNote.style.display = 'none';
    }).catch(function () {
        if (list) list.innerHTML = '<p class="preview-loading">Preview unavailable in this local view. Open through GitHub Pages or a local server.</p>';
        if (fallbackNote) fallbackNote.style.display = '';
    });
}

function initNewsToggle() {
    var newsList = document.querySelectorAll('.news.news-full ul li');
    var moreNewsBtn = document.getElementById('moreNewsBtn');
    var lessNewsBtn = document.getElementById('lessNewsBtn');
    if (!moreNewsBtn || !lessNewsBtn || newsList.length === 0) return;

    for (var i = 5; i < newsList.length; i++) {
        newsList[i].style.display = 'none';
    }
    moreNewsBtn.style.display = 'inline-flex';
    lessNewsBtn.style.display = 'none';
}

function normalizePublicationMeta() {
    var papers = document.querySelectorAll('.research-proj');
    papers.forEach(function (paper) {
        if (paper.querySelector('.pub-summary')) return;
        var p = paper.querySelector('p');
        if (!p) return;

        var originalMeta = paper.querySelector('.paper-meta');
        if (originalMeta) originalMeta.style.display = 'none';

        var breaks = Array.from(p.querySelectorAll('br'));
        var venueText = '';
        var resourceLinks = [];

        if (breaks.length >= 2) {
            var firstBreak = breaks[0];
            var secondBreak = breaks[1];
            var node = firstBreak.nextSibling;
            while (node && node !== secondBreak) {
                venueText += node.textContent || '';
                node = node.nextSibling;
            }
            node = secondBreak.nextSibling;
            while (node) {
                if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'a') {
                    resourceLinks.push(node.cloneNode(true));
                }
                if (node.nodeType === 1 && node.querySelectorAll) {
                    Array.from(node.querySelectorAll('a')).forEach(function (a) {
                        resourceLinks.push(a.cloneNode(true));
                    });
                }
                node = node.nextSibling;
            }
            while (firstBreak.nextSibling) {
                p.removeChild(firstBreak.nextSibling);
            }
        }

        venueText = venueText.replace(/\s+/g, ' ').trim();
        var summary = document.createElement('span');
        summary.className = 'paper-meta paper-meta-line pub-summary';

        var year = document.createElement('span');
        year.className = 'paper-year';
        year.textContent = paper.getAttribute('data-year') || '';
        summary.appendChild(year);

        if (paper.getAttribute('data-select') === 'True') {
            var selected = document.createElement('span');
            selected.className = 'selected-badge';
            selected.textContent = 'Selected';
            summary.appendChild(selected);
        }

        if (venueText) {
            var venue = document.createElement('a');
            venue.className = 'pub-venue';
            venue.textContent = venueText;
            venue.href = (resourceLinks[0] && resourceLinks[0].href) || (paper.querySelector('.research-proj-title') || {}).href || '#';
            summary.appendChild(venue);
        }

        var seen = {};
        resourceLinks.forEach(function (link) {
            var label = (link.textContent || '').replace(/\s+/g, ' ').trim();
            if (!label || seen[label + link.href]) return;
            seen[label + link.href] = true;
            summary.appendChild(link);
        });
        p.appendChild(summary);
    });
}

function initPaperFiltering() {
    var researchSection = document.querySelector('.research-full');
    if (!researchSection) return;
    var papers = document.querySelectorAll('.research-proj');
    if (papers.length === 0) return;

    var filterContainer = document.createElement('div');
    filterContainer.className = 'paper-filter';

    var selectedFilter = document.createElement('div');
    selectedFilter.className = 'filter-group selected-filter-group';
    selectedFilter.innerHTML = '<strong>Selected Papers:</strong> ';
    var selectedCheckbox = document.createElement('input');
    selectedCheckbox.type = 'checkbox';
    selectedCheckbox.id = 'selected-filter';
    selectedCheckbox.checked = true;
    var selectedLabel = document.createElement('label');
    selectedLabel.htmlFor = 'selected-filter';
    selectedLabel.textContent = 'Show Selected Papers';
    selectedFilter.appendChild(selectedCheckbox);
    selectedFilter.appendChild(selectedLabel);
    filterContainer.appendChild(selectedFilter);

    var row = document.createElement('div');
    row.className = 'filter-row';

    var topicFilter = document.createElement('div');
    topicFilter.className = 'filter-group';
    topicFilter.innerHTML = '<strong>Filter by Topics:</strong> ';
    var topicSelect = document.createElement('select');
    topicSelect.id = 'topic-filter';
    var topicOptions = [
        ['all', 'All Topics'],
        ['LLM/MLLM Foundation Models', 'LLM/MLLM Foundation Models'],
        ['Efficienct AI', 'Efficienct AI'],
        ['Neural Architecture Design and Search', 'Neural Architecture Design and Search'],
        ['Classical Computer Vision', 'Classical Computer Vision']
    ];
    topicOptions.forEach(function (item) {
        var option = document.createElement('option');
        option.value = item[0];
        option.textContent = item[1];
        topicSelect.appendChild(option);
    });
    topicFilter.appendChild(topicSelect);
    row.appendChild(topicFilter);

    var years = new Set();
    papers.forEach(function (paper) {
        var year = paper.getAttribute('data-year');
        if (year) years.add(year);
    });
    var yearFilter = document.createElement('div');
    yearFilter.className = 'filter-group';
    yearFilter.innerHTML = '<strong>Filter by Year:</strong> ';
    var yearSelect = document.createElement('select');
    yearSelect.id = 'year-filter';
    var defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'All Years';
    yearSelect.appendChild(defaultOption);
    Array.from(years).sort(function (a, b) { return b - a; }).forEach(function (year) {
        var option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    yearFilter.appendChild(yearSelect);
    row.appendChild(yearFilter);
    filterContainer.appendChild(row);
    researchSection.insertBefore(filterContainer, papers[0]);

    document.getElementById('year-filter').addEventListener('change', filterPapers);
    document.getElementById('topic-filter').addEventListener('change', filterPapers);
    document.getElementById('selected-filter').addEventListener('change', filterPapers);
    filterPapers();
}

function filterPapers() {
    var yearEl = document.getElementById('year-filter');
    var topicEl = document.getElementById('topic-filter');
    var selectedEl = document.getElementById('selected-filter');
    var researchSection = document.getElementById('paper');
    if (!yearEl || !topicEl || !selectedEl || !researchSection) return;

    var yearFilter = yearEl.value;
    var topicFilter = topicEl.value;
    var selectedFilter = selectedEl.checked;
    var papers = Array.from(document.querySelectorAll('.research-proj'));
    papers.sort(function (a, b) {
        return Number(b.getAttribute('data-year') || 0) - Number(a.getAttribute('data-year') || 0);
    });
    papers.forEach(function (paper) {
        var paperYear = paper.getAttribute('data-year');
        var paperTopics = paper.getAttribute('data-topics') || '';
        var isSelected = paper.getAttribute('data-select');
        var yearMatch = (yearFilter === 'all' || paperYear === yearFilter);
        var topicMatch = (topicFilter === 'all' || paperTopics.indexOf(topicFilter) !== -1);
        var selectedMatch = (!selectedFilter || isSelected === 'True');
        if (yearMatch && topicMatch && selectedMatch) {
            paper.style.display = '';
            researchSection.appendChild(paper);
        } else {
            paper.style.display = 'none';
        }
    });
}
