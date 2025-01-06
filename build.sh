#!/usr/bin/env bash

# **************************************************************************** #
#                                                                              #
#                                                         ::::::::             #
#    build.sh                                           :+:    :+:             #
#                                                      +:+                     #
#    By: fbes <fbes@student.codam.nl>                 +#+                      #
#                                                    +#+                       #
#    Created: 2021/10/16 02:27:17 by fbes          #+#    #+#                  #
#    Updated: 2022/07/23 15:23:22 by fbes          ########   odam.nl          #
#                                                                              #
# **************************************************************************** #

OrigDir=$(pwd)
ScriptRoot=$(dirname "$(readlink "$0")")
ChromiumZip="${ScriptRoot}/chromium.zip"
FirefoxZip="${ScriptRoot}/firefox.zip"
NoProgressBar="false"

# Modify the following two lines to enable logging for subprocesses
MainLog="${ScriptRoot}/build.log" #build.log
ErrorLog="${ScriptRoot}/build.error.log" #build.error.log

# Clear logs
echo "" > "${MainLog}"
echo "" > "${ErrorLog}"

# Exit with error when a command is not found, showing installation options.
# Has parameters:
# $1: the command not found
function CommandNotFound() {
	echo "Error: ${1} command not found"
	echo "On macOS, install it with brew: 'brew install ${1}'"
	echo "On most Linux distros, install it with apt: 'apt install ${1}'"
	exit 1
}

# Check for git command (required for dependencies)
if ! command -v git &> /dev/null; then
	CommandNotFound "git"
fi

# Check for npm command (required by dependencies)
if ! command -v npm &> /dev/null; then
	CommandNotFound "npm"
fi

# Check for zip command (required for building)
if ! command -v zip &> /dev/null; then
	CommandNotFound "zip"
fi

# Check for awk command (required for progress bar)
if ! command -v awk &> /dev/null; then
	CommandNotFound "awk"
fi

# ProgressBar displaying function, takes parameters:
# $1: currentPercentage
# $2: progressBar name
# $3: status
# $4: current operation
function ProgressBar {
	if [ $NoProgressBar = "true" ]; then
		echo "$1% ${3}: ${4}"
		return
	fi
	[ $1 = "0" ] && printf '\n\n\n\n\n\n\x1b[?25l' # Set up required space on start, hide cursor
	let _done=(${1}*5)/10 # Calculate amount of progress done characters (#)
	let _left=50-${_done} # Calculate amount of progress left characters (-)
	_fill=$(printf "%${_done}s") # Create filler string (progress, #)
	_empty=$(printf "%${_left}s") # Create empty filler string (-)
	_nl='\x1b[0K\n' # ANSI Escape sequence to clear remaining part of the current line and then start a new line
	printf "\r\x1b[5A${2}${_nl}   ${3}${_nl}   [${_fill// /#}${_empty// /-}] ${1}%%${_nl}${_nl}   ${4}${_nl}"
	[ $1 = "100" ] && printf '\x1b[?25h' # Show cursor
}

# Check if build.txt exists
# build.txt contains the paths of files to include in the extension
if [ ! -f "${ScriptRoot}/build.txt" ]; then
	echo "Error: ${ScriptRoot}/build.txt not found"
	exit 1
fi

# Make cursor invisible (ANSI Escape Sequence)
ProgressBar 0 'Building Improved Intra' 'Preparing...' 'Initializing...'

# Uncomment the following lines to force the script to redownload submodules
rm -rf "${ScriptRoot}/server"
rm -rf "${ScriptRoot}/fixes/galaxygraph"

# Update submodules
ProgressBar 5 'Building Improved Intra' 'Preparing...' 'Updating submodules...'
git submodule update --init --recursive >>"$MainLog" 2>>"$ErrorLog"

# Install dependencies for GalaxyGraph and build the submodule
cd "${ScriptRoot}/fixes/galaxygraph"
ProgressBar 15 'Building Improved Intra' 'Preparing...' 'Installing dependencies...'
npm install >>"$MainLog" 2>>"$ErrorLog"
ProgressBar 35 'Building Improved Intra' 'Preparing...' 'Installing dependencies...'
npm run build >>"$MainLog" 2>>"$ErrorLog"
cd "$OrigDir"

# Remove old Chrome build
ProgressBar 45 'Building Improved Intra' 'Preparing...' 'Removing old Chromium build...'
rm -rf "${ChromiumZip}"
if [ -e "${ChromiumZip}" ]; then
	echo "Could not delete ${ChromiumZip} (it still exists)"
	exit 1
fi

# Remove old Firefox build
ProgressBar 46 'Building Improved Intra' 'Preparing...' 'Removing old Firefox build...'
rm -rf "${FirefoxZip}"
if [ -e "${FirefoxZip}" ]; then
	echo "Could not delete ${FirefoxZip} (it still exists)"
	exit 1
fi

# Remove temp folder
ProgressBar 47 'Building Improved Intra' 'Preparing...' 'Removing old temp folder...'
rm -rf "${ScriptRoot}/temp"
if [ -e "${ScriptRoot}/temp" ]; then
	echo "Could not delete ${ScriptRoot}/temp folder (it still exists)"
	exit 1
fi

# Create temp folder
ProgressBar 49 'Building Improved Intra' 'Preparing...' 'Creating temp folder...'
mkdir "${ScriptRoot}/temp"
if [ ! -d "${ScriptRoot}/temp" ]; then
	echo "Could not create ${ScriptRoot}/temp folder"
	exit 1
fi

# Function that gathers the contents for the zip files. Takes parameters:
# $1: starting percentage
# $2: maximum amount this function may increase the percentage with
function GatherZipContents {
	# Set up
	AmountOfLinesToAdd=$(wc -l < "${ScriptRoot}/build.txt")
	IncreaseBy=$(awk "BEGIN {print ${2} / ${AmountOfLinesToAdd}}")
	let Iterator=0

	# Read every line of build.txt as a path to add to the zip archive
	{
		while IFS= read -r Line; do
			# If line is a comment (first char is a #), skip it
			if [[ ${Line} == '#'* ]]; then
				let Iterator++
				continue
			fi

			# Remove line breaks from line
			Line=${Line//$'\n'/}
			Line=${Line//$'\r'/}

			# Write progress bar
			Progress=$(awk "BEGIN {print ${1} + int($IncreaseBy * ${Iterator})}")
			ProgressBar ${Progress} 'Building Improved Intra' 'Gathering files...' "Gathering ${ScriptRoot}/$Line..."

			# Get the path and the filename
			Path=$(dirname "${Line}")
			Filename=$(basename "${Line}")

			# Get the source path and the destination path
			SourcePath="${ScriptRoot}/${Path}"
			DestPath="${ScriptRoot}/temp/${Path}"

			# Make sure the directory to copy to exists before copy, otherwise it will be the name
			mkdir -p "${DestPath}" 2>>"${ErrorLog}"

			if [ "${Filename}" = '*' ]; then
				# Recursively copy items
				cp -fr ${SourcePath}/${Filename} "${DestPath}" 2>>"${ErrorLog}"
			else
				# Copy only items in the mentioned directory
				cp -f ${SourcePath}/${Filename} "${DestPath}" 2>>"${ErrorLog}"
			fi

			let Iterator++
		done
	} < "${ScriptRoot}/build.txt"
}

# Gather the contents for the zip archives to build
GatherZipContents 50 10

# Go to temp folder
cd "${ScriptRoot}/temp"

# Create archive for Chromium browsers
ProgressBar 60 'Building Improved Intra' 'Building...' 'Building for Chromium...'
zip -r "build.zip" . >>"${MainLog}" 2>>"${ErrorLog}"
mv "build.zip" "../${ChromiumZip}"

# Modify the archive specifically for Firefox
ProgressBar 75 'Building Improved Intra' 'Building...' 'Preparing Firefox build...'
rm -rf "sw.js" 2>>"${ErrorLog}"
rm -rf "manifest.json" 2>>"${ErrorLog}"
cp "../manifest-ff.json" "./manifest.json" 2>>"${ErrorLog}"

# Create archive for Firefox browser
ProgressBar 80 'Building Improved Intra' 'Building...' 'Building for Firefox...'
zip -r "build.zip" . >> "${MainLog}" 2>>"${ErrorLog}"
mv "build.zip" "../${FirefoxZip}"

# Go to original dir
cd "${OrigDir}"

# Clean up
ProgressBar 95 'Building Improved Intra' 'Building...' 'Finishing...'
rm -rf "${ScriptRoot}/temp" 2>>"${ErrorLog}"

# Let user know we are done building
ProgressBar 100 'Building Improved Intra' 'Build complete' ''
