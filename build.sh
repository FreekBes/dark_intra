#!/bin/bash
if [[ $OSTYPE == 'darwin'* ]]; then
	zip -r chromium.zip manifest.json LICENSE js/* options/* css/* campus_specifics/* images/logo*.png _locales/*
	mv manifest.json manifest-chromium.json
	mv manifest-ff.json manifest.json
	zip -r firefox.zip manifest.json LICENSE js/* options/* css/* campus_specifics/* images/logo*.png _locales/*
	mv manifest.json manifest-ff.json
	mv manifest-chromium.json manifest.json
else
	7z a chromium.zip manifest.json LICENSE js/* options/* css/* campus_specifics/* images/logo*.png _locales/*
	mv manifest.json manifest-chromium.json
	mv manifest-ff.json manifest.json
	7z a firefox.zip manifest.json LICENSE js/* options/* css/* campus_specifics/* images/logo*.png _locales/*
	mv manifest.json manifest-ff.json
	mv manifest-chromium.json manifest.json
fi
