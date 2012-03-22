cd deployable
tar -vzcf ../deployable.tgz *
cd ..

curl -v -X POST 127.0.0.1:9002/environment/development
curl -v -X POST 127.0.0.1:9002/user/haibu
curl -v -X POST 127.0.0.1:9002/user/haibu/application/hellohaibu
curl -v -X POST --header 'content-type: application/json'\
   --data @deployable/repository.json 127.0.0.1:9002/user/haibu/application/hellohaibu/repository/deployable
curl -v -X PUT --header 'content-type: application/x-compressed-tar'\
   --data-binary @deployable.tgz 127.0.0.1:9002/user/haibu/application/hellohaibu/repository/deployable/upload
curl -v -X POST 127.0.0.1:9002/environment/development/user/haibu/application/hellohaibu/repository/deployable/drone
