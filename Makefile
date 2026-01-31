
.PHONY: dev-server
dev-server:
	node server/fileserver.js

format:
	prettier --tab-width=4 -w client server

format-ben:
    npx prettier --tab-width=4 -w client server

docker:
	docker run -it \
		-v .:/home/node/app \
		--workdir=/home/node/app \
		-p 8000:8000 \
		node:latest node ./server/fileserver.js
