PKG_NAME=home_dashboard

build:
		docker build -t ${PKG_NAME} .

run:
		docker rm ${PKG_NAME} || true
		docker run -d --name ${PKG_NAME} -p 3000:3000 --volume=`pwd`/data:/data ${PKG_NAME}

stop:
		docker kill ${PKG_NAME} || true
		docker rm ${PKG_NAME} || true

logs:
		docker logs ${PKG_NAME}

clean:
		docker ps -a | grep -v "CONTAINER" | awk '{print $$1}' | xargs docker rm
		docker images -a | grep "^<none>" | awk '{print $$3}' | xargs docker rmi
