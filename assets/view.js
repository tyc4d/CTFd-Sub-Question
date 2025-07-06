// Ensure we don't redeclare variables if script loads multiple times
if (typeof CTFd._internal.challenge.multiQuestionInit === 'undefined') {

// Custom translation loader for this plugin
function loadTranslations(challengeData) {
    return new Promise((resolve, reject) => {
        // Use multiple fallback methods to detect language
        let lang = 'en'; // Default fallback
        
        // Method 1: Check for locale in challenge data
        if (challengeData && challengeData.user_locale) {
            lang = challengeData.user_locale;
        }
        // Method 2: Check HTML lang attribute
        else if (document.documentElement.lang) {
            lang = document.documentElement.lang;
        }
        // Method 3: Use browser language preference
        else if (navigator.language) {
            const browserLang = navigator.language.toLowerCase();
            // Map browser language codes to our supported languages
            if (browserLang.includes('zh-tw') || browserLang.includes('zh-hant')) {
                lang = 'zh_Hant_TW';
            } else if (browserLang.includes('zh-cn') || browserLang.includes('zh-hans')) {
                lang = 'zh_CN';
            } else if (browserLang.includes('zh')) {
                lang = 'zh_Hant_TW'; // Default Chinese to Traditional
            } else {
                lang = 'en'; // Default to English for other languages
            }
        }
        
        console.log("Loading translations for language:", lang);
        console.log("Detection method - CTFd.config.user:", CTFd.config?.user);
        console.log("Detection method - HTML lang:", document.documentElement.lang);
        console.log("Detection method - Browser lang:", navigator.language);
        
        const translationUrl = `/plugins/subquestionchallenge/assets/translations/${lang}/translations.json`;

        fetch(translationUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    // Fallback to English if the language file is not found
                    console.warn(`Translation file for ${lang} not found, falling back to English.`);
                    const fallbackUrl = `/plugins/subquestionchallenge/assets/translations/en/translations.json`;
                    return fetch(fallbackUrl).then(res => res.json());
                }
            })
            .then(translations => {
                if (typeof CTFd.translations === 'undefined') {
                    CTFd.translations = {};
                }
                Object.assign(CTFd.translations, translations);
                resolve();
            })
            .catch(error => {
                console.error('Error loading translation file:', error);
                reject(error);
            });
    });
}

if (typeof CTFd.translations === 'undefined') {
    CTFd.translations = {};
}
const __ = (str) => CTFd.translations[str] || str;

CTFd._internal.challenge.data = undefined;

// TODO: Remove in CTFd v4.0
CTFd._internal.challenge.renderer = null;

CTFd._internal.challenge.preRender = function() {
    console.log("Multi Question Challenge preRender called");
    return loadTranslations(CTFd._internal.challenge.data);
};

// TODO: Remove in CTFd v4.0
CTFd._internal.challenge.render = null;

CTFd._internal.challenge.postRender = function() {
    // This runs after the challenge modal is rendered
    console.log("Multi Question Challenge postRender called");
    
    // Add a small delay to ensure DOM is ready
    setTimeout(function() {
        initMultiQuestionInterface();
    }, 200);
};

// Store original submit function
var originalSubmit = CTFd._internal.challenge.submit;

CTFd._internal.challenge.submit = function(preview) {
    console.log("CTFd internal submit blocked for multi-question challenge");
    // Completely block the internal submit to prevent double requests
    return Promise.resolve({
        success: false,
        data: {
            status: "blocked",
            message: __("Please use the multi-question interface to submit")
        }
    });
};

// Override the submit button behavior for multi-question challenges
function overrideSubmitBehavior() {
    console.log("Overriding submit behavior...");
    
    // Check if already overridden
    if (CTFd.lib.$("#challenge-submit-multi").length > 0 || CTFd.lib.$("#challenge-submit").data('multi-question-override')) {
        console.log("Submit behavior already overridden, skipping...");
        return;
    }
    
    // Completely replace the submit button to avoid any CTFd interference
    var originalButton = CTFd.lib.$("#challenge-submit");
    var buttonHtml = originalButton[0].outerHTML;
    
    // Create a new button with the same styling but completely new element
    var newButton = CTFd.lib.$(buttonHtml);
    newButton.attr('id', 'challenge-submit-multi');
    newButton.removeAttr('x-on:click'); // Remove Alpine.js bindings
    newButton.removeAttr('@click');     // Remove other framework bindings
    
    // Replace the original button
    originalButton.replaceWith(newButton);
    
    // Remove ALL existing event handlers from multiple elements
    CTFd.lib.$("#challenge-submit-multi").off();
    CTFd.lib.$("#challenge-input").off();
    CTFd.lib.$("#challenge-window form").off();
    CTFd.lib.$("#challenge-window").off('submit');
    CTFd.lib.$("body").off('submit', '#challenge-window form');
    CTFd.lib.$(document).off('click', '#challenge-submit, #challenge-submit-multi');
    CTFd.lib.$(document).off('submit', '#challenge-window form');
    
    // Mark as overridden
    CTFd.lib.$("#challenge-submit-multi").data('multi-question-override', true);
    
    // Prevent form submission entirely
    CTFd.lib.$("#challenge-window form").on('submit.multi-question', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log("Form submit blocked for multi-question challenge");
        return false;
    });
    
    // Also prevent any Alpine.js submission
    CTFd.lib.$(document).on('click.multi-question', function(e) {
        if (e.target && (e.target.id === 'challenge-submit' || e.target.closest('#challenge-submit'))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log("Alpine.js submit blocked, redirecting to custom handler");
            CTFd.lib.$("#challenge-submit-multi").trigger('click.multi-question');
            return false;
        }
    });
    
    // Add our custom click handler
    CTFd.lib.$("#challenge-submit-multi").on('click.multi-question', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Prevent rapid double-clicks
        if (CTFd.lib.$(this).data('submitting')) {
            console.log("Already submitting, ignoring duplicate click");
            return;
        }
        
        console.log("Custom submit handler triggered");
        
        // Check if all questions are completed
        var allCompleted = multiQuestionData.questions.every(q => q.solved);
        if (allCompleted) {
            showSimpleNotification(
                __("Hint"),
                __("All questions have been completed! Congratulations on finishing this challenge.")
            );
            return;
        }
        
        var challenge_id = parseInt(CTFd.lib.$("#challenge-id").val());
        var submission = CTFd.lib.$("#challenge-input").val();
        var question_num = CTFd.lib.$("#question-selector").val();

        console.log("Submit data:", { challenge_id, submission, question_num });

        if (!question_num) {
            showSimpleNotification(
                __("Error"),
                __("Please select a question")
            );
            return;
        }
        
        // Disable submit button and mark as submitting
        CTFd.lib.$(this).prop('disabled', true);
        CTFd.lib.$(this).addClass('disabled-button');
        CTFd.lib.$(this).data('submitting', true);

        var body = {
            challenge_id: challenge_id,
            submission: submission,
            question_num: question_num
        };

        console.log("Sending request with body:", body);

        return CTFd.fetch('/api/v1/challenges/attempt', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then(response => response.json()).then(function(response) {
            console.log("Response received:", response);
            
            // Re-enable submit button
            CTFd.lib.$("#challenge-submit-multi").prop('disabled', false);
            CTFd.lib.$("#challenge-submit-multi").removeClass('disabled-button');
            CTFd.lib.$("#challenge-submit-multi").data('submitting', false);
            
            if (response.status === 403) {
                // User is not logged in or CTF is paused.
                return response;
            }
            if (response.status === 429) {
                // User was ratelimited but process response
                return response;
            }
            
            // Handle all responses with our custom handler
            if (response.success && (response.data.status === "correct" || response.data.status === "partial")) {
                // Mark question as solved
                markQuestionAsSolved(question_num);
                updateProgress();
                // Clear input
                CTFd.lib.$("#challenge-input").val('');

                // Re-enable button immediately on correct answer
                CTFd.lib.$("#challenge-submit-multi").prop('disabled', false);
                CTFd.lib.$("#challenge-submit-multi").removeClass('disabled-button');
                CTFd.lib.$("#challenge-submit-multi").data('submitting', false);

            } else {
                // For incorrect answers or other errors, apply a cooldown
                const cooldownSeconds = response.status === 429 ? 10 : 3; // Longer cooldown if rate-limited
                applySubmitCooldown(cooldownSeconds);
            }
            
            // Show result
            showMultiQuestionResponse(response.data);
            
            return response;
        }).catch(function(error) {
            console.error("Submit error:", error);
            // Re-enable submit button
            CTFd.lib.$("#challenge-submit-multi").prop('disabled', false);
            CTFd.lib.$("#challenge-submit-multi").removeClass('disabled-button');
            CTFd.lib.$("#challenge-submit-multi").data('submitting', false);
            throw error;
        });
    });
    
    // Handle Enter key
    CTFd.lib.$("#challenge-input").on('keyup.multi-question', function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            CTFd.lib.$("#challenge-submit-multi").trigger('click.multi-question');
        }
    });
}

// Multi-question specific functions
var multiQuestionData = {
    questions: [],
    initialized: false
};

function initMultiQuestionInterface() {
    console.log("Initializing multi-question interface...");
    
    if (multiQuestionData.initialized) {
        console.log("Already initialized, skipping...");
        return;
    }
    
    // Mark as being initialized to prevent race conditions
    multiQuestionData.initialized = true;
    
    // Try multiple ways to get challenge ID
    var challengeId = null;
    
    // Method 1: From challenge-id input
    var challengeIdInput = CTFd.lib.$("#challenge-id");
    if (challengeIdInput.length > 0 && challengeIdInput.val()) {
        challengeId = parseInt(challengeIdInput.val());
    }
    
    // Method 2: From the modal's x-init attribute
    if (!challengeId) {
        var modal = CTFd.lib.$('#challenge-window');
        if (modal.length > 0) {
            var xInit = modal.attr('x-init');
            if (xInit) {
                var match = xInit.match(/id\s*=\s*(\d+)/);
                if (match) {
                    challengeId = parseInt(match[1]);
                }
            }
        }
    }
    
    // Method 3: From any data attributes
    if (!challengeId) {
        var dataId = CTFd.lib.$('[data-challenge-id]').attr('data-challenge-id');
        if (dataId) {
            challengeId = parseInt(dataId);
        }
    }
    
    console.log("Found challenge ID:", challengeId);
    
    if (!challengeId) {
        console.error("Challenge ID not found, retrying in 500ms...");
        // Reset initialization flag for retry
        multiQuestionData.initialized = false;
        setTimeout(function() {
            if (!multiQuestionData.initialized) {
                initMultiQuestionInterface();
            }
        }, 500);
        return;
    }
    
    // Load challenge data to get questions
    CTFd.fetch(`/api/v1/challenges/${challengeId}`, {
        method: 'GET',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        console.log("Challenge data loaded:", data);
        
        if (data.success && data.data && data.data.questions) {
            multiQuestionData.questions = data.data.questions.map(q => ({
                num: q.num,
                text: q.text,
                points: q.points,
                solved: q.solved || false
            }));
            
            console.log("Loaded questions:", multiQuestionData.questions);
            createMultiQuestionInterface();
            // Already marked as initialized at the beginning
        } else {
            console.log("No questions found or failed to load data");
            // Reset if failed to load
            multiQuestionData.initialized = false;
        }
    })
    .catch(error => {
        console.error("Error loading challenge data:", error);
        // Reset if error occurred
        multiQuestionData.initialized = false;
    });
}

function createMultiQuestionInterface() {
    var submitRow = CTFd.lib.$('.submit-row');
    
    if (submitRow.length === 0) {
        console.error("Submit row not found");
        return;
    }
    
    // Remove any existing multi-question interface
    CTFd.lib.$('.multi-question-container').remove();
    
    // Create our multi-question container
    var containerHtml = `
        <div class="multi-question-container mb-3">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">${__('Multi Question Challenge')}</h5>
                </div>
                <div class="card-body">
                    <!-- Score statistics overview -->
                    <div class="row mb-3">
                        <div class="col-12">
                            <div class="card border-info">
                                <div class="card-body text-center py-3">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center justify-content-center">
                                                <div class="text-info" style="font-size: 1.5em; margin-right: 8px;">📊</div>
                                                <div>
                                                    <div class="font-weight-bold text-info" id="score-display">
                                                        ${multiQuestionData.questions.filter(q => q.solved).reduce((sum, q) => sum + q.points, 0)} / ${multiQuestionData.questions.reduce((sum, q) => sum + q.points, 0)}
                                                    </div>
                                                    <small class="text-muted">${__('Score Acquired')}</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center justify-content-center">
                                                <div class="text-success" style="font-size: 1.5em; margin-right: 8px;">✅</div>
                                                <div>
                                                    <div class="font-weight-bold text-success" id="progress-display">
                                                        ${multiQuestionData.questions.filter(q => q.solved).length} / ${multiQuestionData.questions.length}
                                                    </div>
                                                    <small class="text-muted">${__('Questions Completed')}</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="d-flex align-items-center justify-content-center">
                                                <div class="text-warning" style="font-size: 1.5em; margin-right: 8px;">⏱️</div>
                                                <div>
                                                    <div class="font-weight-bold text-warning" id="remaining-display">
                                                        ${multiQuestionData.questions.filter(q => !q.solved).length}
                                                    </div>
                                                    <small class="text-muted">${__('Questions Remaining')}</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed question list -->
                    <div id="multi-questions" class="mb-3">
                        ${multiQuestionData.questions.map(q => `
                            <div class="card mb-2 ${q.solved ? 'border-success' : ''}" data-question="${q.num}">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <h6 class="card-title d-flex align-items-center">
                                                <span class="question-status-icon" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 8px; ${q.solved ? 'background-color: #28a745; color: white;' : 'background-color: #6c757d; color: white;'}">
                                                    ${q.solved ? '✓' : q.num}
                                                </span>
                                                ${__('Question')} ${q.num} (${q.points} ${__('points')})
                                            </h6>
                                            <p class="card-text"></p>
                                        </div>
                                        <span class="badge ${q.solved ? 'badge-success' : 'badge-secondary'}" style="margin-left: 8px; ${q.solved ? 'color: #ffffff; background-color: #28a745;' : ''}">${q.solved ? __('Completed') : __('Unsolved')}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div id="question-selector-section" class="form-group">
                        <div id="question-selection-area" ${multiQuestionData.questions.every(q => q.solved) ? 'style="display: none;"' : ''}>
                            <label for="question-selector" class="font-weight-bold text-primary">${__('Select a question to answer:')}</label>
                            <select id="question-selector" class="form-control form-control-lg" style="border: 2px solid #007bff; background-color: #f8f9fa;">
                                ${multiQuestionData.questions.filter(q => !q.solved).map(q => `
                                    <option value="${q.num}">${__('Question')} ${q.num} (${q.points} ${__('points')})</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div id="completion-message" class="alert alert-success text-center" ${multiQuestionData.questions.every(q => q.solved) ? '' : 'style="display: none;"'}>
                            <div class="mb-3">
                                <div style="font-size: 3em; animation: bounce 1s infinite;">🏆</div>
                            </div>
                            <h4 class="mb-2" style="color: #28a745; font-weight: bold;">🎉 ${__('Congratulations on completing all questions!')} 🎉</h4>
                            <p class="mb-2">${__('You have successfully solved all questions in this multi-question challenge.')}</p>
                            <div class="mt-3">
                                <span class="badge badge-success badge-lg p-2" style="font-size: 1.1em; color: #ffffff; background-color: #28a745;">
                                    ✓ ${__('Challenge Completed')} ✓
                                </span>
                            </div>
                            <style>
                                @keyframes bounce {
                                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                                    40% { transform: translateY(-10px); }
                                    60% { transform: translateY(-5px); }
                                }
                            </style>
                        </div>
                    </div>
                    <div id="multi-question-response-container"></div>
                </div>
            </div>
        </div>
    `;
    
    // Insert before submit row
    submitRow.before(containerHtml);
    
    // Safely set question text to prevent XSS
    multiQuestionData.questions.forEach(q => {
        const questionCard = CTFd.lib.$(`.card[data-question="${q.num}"]`);
        if (questionCard.length) {
            questionCard.find('.card-text').text(q.text);
        }
    });

    // Update the input placeholder
    CTFd.lib.$("#challenge-input").attr('placeholder', __('Enter the flag for the selected question'));
    
    // Override the submit button behavior
    setTimeout(function() {
        overrideSubmitBehavior();
    }, 100);
    
    console.log("Multi-question interface created successfully");
}

function markQuestionAsSolved(questionNum) {
    // Update the detailed question card
    var questionCard = CTFd.lib.$(`.card[data-question="${questionNum}"]`);
    if (questionCard.length > 0) {
        // Update badge
        var badge = questionCard.find('.badge');
        badge.removeClass('badge-secondary').addClass('badge-success');
        badge.css({
            'color': '#ffffff',
            'background-color': '#28a745'
        });
        badge.text(__('Completed'));
        
        // Update card border
        questionCard.addClass('border-success');
        
        // Update question status icon in the card
        var statusIcon = questionCard.find('.question-status-icon');
        statusIcon.css({
            'background-color': '#28a745',
            'color': 'white'
        }).text('✓');
    }
    
    // Update the score and progress statistics will be handled by updateProgress() function
    
    // Update local questions array
    var question = multiQuestionData.questions.find(q => q.num == questionNum);
    if (question) {
        question.solved = true;
    }
    
    // Check if this was the last question
    var allCompleted = multiQuestionData.questions.every(q => q.solved);
    if (allCompleted) {
        // Add a short delay before showing completion to let the UI update
        setTimeout(function() {
            showSimpleNotification(
                __("Hint"),
                __("All questions have been completed! Congratulations on finishing this challenge.")
            );
        }, 500);
    }
}

function updateProgress() {
    var solved = multiQuestionData.questions.filter(q => q.solved).length;
    var total = multiQuestionData.questions.length;
    var allCompleted = solved === total;
    
    // Calculate scores
    var earnedPoints = multiQuestionData.questions.filter(q => q.solved).reduce((sum, q) => sum + q.points, 0);
    var totalPoints = multiQuestionData.questions.reduce((sum, q) => sum + q.points, 0);
    var remaining = total - solved;
    
    // Update the header text to show completion status
    var cardHeader = CTFd.lib.$('.multi-question-container .card-header h5');
    if (cardHeader.length > 0) {
        if (allCompleted) {
            cardHeader.html(`${__('Multi Question Challenge')} <span class="badge badge-success" style="margin-left: 8px; color: #ffffff; background-color: #28a745;">${__('All Completed')}</span>`);
        } else {
            cardHeader.html(`${__('Multi Question Challenge')} <span class="badge badge-info" style="margin-left: 8px; color: #ffffff; background-color: #17a2b8;">${solved}/${total} ${__('Completed')}</span>`);
        }
    }
    
    // Update score statistics
    var scoreDisplay = CTFd.lib.$('#score-display');
    var progressDisplay = CTFd.lib.$('#progress-display');
    var remainingDisplay = CTFd.lib.$('#remaining-display');
    
    if (scoreDisplay.length > 0) {
        scoreDisplay.text(`${earnedPoints} / ${totalPoints}`);
    }
    
    if (progressDisplay.length > 0) {
        progressDisplay.text(`${solved} / ${total}`);
    }
    
    if (remainingDisplay.length > 0) {
        remainingDisplay.text(remaining);
    }
    
    // Handle question selector visibility
    var questionSelectionArea = CTFd.lib.$('#question-selection-area');
    var completionMessage = CTFd.lib.$('#completion-message');
    var challengeInput = CTFd.lib.$('#challenge-input');
    var challengeSubmit = CTFd.lib.$('#challenge-submit-multi');
    
    if (allCompleted) {
        // Hide selection area and input
        questionSelectionArea.hide();
        challengeInput.hide();
        challengeSubmit.hide();
        
        // Show completion message
        completionMessage.show();
    } else {
        // Show selection area and input
        questionSelectionArea.show();
        challengeInput.show();
        challengeSubmit.show();
        
        // Hide completion message
        completionMessage.hide();
        
        // Update the selector options to only show unsolved questions
        var questionSelector = CTFd.lib.$('#question-selector');
        var currentValue = questionSelector.val();
        var unsolvedQuestions = multiQuestionData.questions.filter(q => !q.solved);
        
        // Rebuild selector options
        questionSelector.empty();
        unsolvedQuestions.forEach(q => {
            questionSelector.append(`<option value="${q.num}">${__('Question')} ${q.num} (${q.points} ${__('points')})</option>`);
        });
        
        // Try to keep current selection if it's still valid
        if (currentValue && unsolvedQuestions.some(q => q.num == currentValue)) {
            questionSelector.val(currentValue);
        } else if (unsolvedQuestions.length > 0) {
            // Select the first unsolved question
            questionSelector.val(unsolvedQuestions[0].num);
        }
    }
}

function showMultiQuestionResponse(data) {
    // Find or create result notification area
    var resultNotification = CTFd.lib.$("#result-notification");
    var resultMessage = CTFd.lib.$("#result-message");
    
    if (resultNotification.length === 0) {
        // Create notification area if it doesn't exist
        var notificationHtml = `
            <div class="row notification-row">
                <div class="col-12">
                    <div id="result-notification" class="alert alert-dismissable text-center w-100" 
                         role="alert" style="display: none;">
                        <strong id="result-message"></strong>
                    </div>
                </div>
            </div>
        `;
        CTFd.lib.$('.multi-question-container').after(notificationHtml);
        resultNotification = CTFd.lib.$("#result-notification");
        resultMessage = CTFd.lib.$("#result-message");
    }
    
    // Clear previous classes
    resultNotification.removeClass();
    resultNotification.addClass("alert alert-dismissable text-center w-100");
    
    // Set message
    resultMessage.text(data.message || "");
    
    // Set appropriate styling based on status
    if (data.status === "correct") {
        resultNotification.addClass("alert-success");
    } else if (data.status === "partial") {
        resultNotification.addClass("alert-info");
    } else if (data.status === "incorrect") {
        resultNotification.addClass("alert-danger");
    } else if (data.status === "already_solved") {
        resultNotification.addClass("alert-info");
    } else {
        resultNotification.addClass("alert-warning");
    }
    
    // Show notification
    resultNotification.show();
    
    // Auto-hide after 5 seconds
    setTimeout(function() {
        resultNotification.hide();
    }, 5000);
}

function applySubmitCooldown(seconds) {
    const submitButton = CTFd.lib.$("#challenge-submit-multi");
    
    // Store original HTML if not already stored
    if (!submitButton.data('original-html')) {
        submitButton.data('original-html', submitButton.html());
    }
    const originalHtml = submitButton.data('original-html');

    submitButton.prop('disabled', true);
    submitButton.addClass('disabled-button');

    let remaining = seconds;
    
    // Set initial text
    submitButton.html(`<i class="fas fa-stopwatch"></i> ${__('Wait')} ${remaining}s`);

    const interval = setInterval(function() {
        remaining--;
        if (remaining <= 0) {
            clearInterval(interval);
            submitButton.html(originalHtml);
            submitButton.prop('disabled', false);
            submitButton.removeClass('disabled-button');
            submitButton.data('submitting', false);
        } else {
            submitButton.html(`<i class="fas fa-stopwatch"></i> ${__('Wait')} ${remaining}s`);
        }
    }, 1000);
}

function showSimpleNotification(title, body) {
    const responseContainer = CTFd.lib.$('#multi-question-response-container');
    const responseHtml = `
        <div class="multi-question-alert alert alert-info alert-dismissible fade show" role="alert">
            <strong>${title}</strong> ${body}
        </div>
    `;
    responseContainer.html(responseHtml);
}

// Mark that we have initialized this script
CTFd._internal.challenge.multiQuestionInit = true;

console.log("Multi Question Challenge view script loaded");

} // End of script initialization check 