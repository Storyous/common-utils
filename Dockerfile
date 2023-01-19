FROM public.ecr.aws/docker/library/node:14-slim

WORKDIR /opt/app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "test"]
