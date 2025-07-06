# Multi-Question Challenge Plugin

## Overview

This plugin extends CTFd to support a new challenge type called "Multi-Question Challenge". It allows a single challenge to contain multiple sub-questions, each with its own question text, flag, and point value. The total score for the challenge is automatically calculated as the sum of all its sub-questions.

This is ideal for scenarios where a single task or artifact (e.g., a file to analyze, a service to exploit) has multiple flags to be found.

## Features

-   Create challenges with multiple, distinct sub-questions.
-   Each sub-question has its own unique text, flag, and point value.
-   A real-time progress tracking UI is displayed in the challenge modal, showing:
    -   Total score acquired vs. total possible score.
    -   Number of questions solved vs. total questions.
    -   Number of questions remaining.
-   The main challenge's score is automatically calculated and updated based on the sum of its sub-questions.
-   Admins can set the challenge state to "Visible" or "Hidden" during creation.

## Installation

1.  Clone this repository or download the source code.
2.  Place the `multiquestionchallenge` directory into the `CTFd/plugins/` directory of your CTFd instance.
3.  Restart the CTFd application.

## Usage

To create a new Multi-Question Challenge, follow these steps:

1.  Navigate to the CTFd Admin Panel.
2.  Go to the "Challenges" page and click the "Create" button.
3.  From the "Type" dropdown menu, select "Multi Question Challenge".
4.  Fill in the standard challenge details: Name, Category, and Description. The "Value" field will be automatically calculated and can be ignored.
5.  In the "Questions & Flags" section that appears, add one or more questions.
    -   For each question, you must provide the **Question Text**, the correct **Flag**, and the **Points** awarded for solving it.
6.  Use the "Add Question" and "Remove Last Question" buttons to manage the list of questions. You must have at least one question.
7.  Set the challenge **State** to "Visible" if you want it to be immediately available to users.
8.  Click the "Create" button to save the challenge. 