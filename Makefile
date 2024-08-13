pipeline-build:
	cd infrastructure && ./pipeline-build.sh

pipeline-synth:
	cd infrastructure && npx cdk synth
