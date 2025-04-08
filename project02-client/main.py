#
# Client-side python app for photoapp, this time working with
# web service, which in turn uses AWS S3 and RDS to implement
# a simple photo application for photo storage and viewing.
#
# Authors:
#   
#   <<<Jessica Hui Guo>>>
#
#   Starter code: Prof. Joe Hummel
#   Northwestern University
#

import requests  # calling web service
import jsons  # relational-object mapping

import uuid
import pathlib
import logging
import sys
import os
import base64
import time

from configparser import ConfigParser

# doesn't work in docker (not easily):
# import matplotlib.pyplot as plt
# import matplotlib.image as img


###################################################################
#
# classes
#
class User:
  userid: int  # these must match columns from DB table
  email: str
  lastname: str
  firstname: str
  bucketfolder: str


class Image:
  imageid: int  # these must match columns from DB table
  stopid: int
  imagename: str
  bucketkey: str


class BucketItem:
  Key: str
  LastModified: str
  ETag: str
  Size: int
  StorageClass: str


###################################################################
#
# web_service_get
#
# When calling servers on a network, calls can randomly fail. 
# The better approach is to repeat at least N times (typically 
# N=3), and then give up after N tries.
#
def web_service_get(url):
  """
  Submits a GET request to a web service at most 3 times, since 
  web services can fail to respond e.g. to heavy user or internet 
  traffic. If the web service responds with status code 200, 400 
  or 500, we consider this a valid response and return the response.
  Otherwise we try again, at most 3 times. After 3 attempts the 
  function returns with the last response.
  
  Parameters
  ----------
  url: url for calling the web service
  
  Returns
  -------
  response received from web service
  """

  try:
    retries = 0
    
    while True:
      response = requests.get(url)
        
      if response.status_code in [200, 400, 500]:
        #
        # we consider this a successful call and response
        #
        break

      #
      # failed, try again?
      #
      retries = retries + 1
      if retries < 3:
        # try at most 3 times
        time.sleep(retries)
        continue
          
      #
      # if get here, we tried 3 times, we give up:
      #
      break

    return response

  except Exception as e:
    print("**ERROR**")
    logging.error("web_service_get() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return None
  

###################################################################
#
# prompt
#
def prompt():
  """
  Prompts the user and returns the command number
  
  Parameters
  ----------
  None
  
  Returns
  -------
  Command number entered by user (0, 1, 2, ...)
  """

  try:
    print()
    print(">> Enter a command:")
    print("   0 => end")
    print("   1 => stats")
    print("   2 => stops")
    print("   3 => images")
    print("   4 => download")
    print("   5 => upload")
    print("   6 => travel time")

    cmd = int(input())
    return cmd

  except Exception as e:
    print("ERROR")
    print("ERROR: invalid input")
    print("ERROR")
    return -1


###################################################################
#
# stats
#
def stats(baseurl):
  """
  Prints out S3 and RDS info: bucket status, # of users and 
  assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/stats'
    url = baseurl + api

    # res = requests.get(url)
    res = web_service_get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code in [400, 500]:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract stats:
    #
    body = res.json()
    #
    print("bucket status:", body["message"])
    print("# of stops:", body["db_numStops"])
    print("# of images:", body["db_numImages"])

  except Exception as e:
    logging.error("stats() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# users
#
def stops(baseurl):
  """
  Prints out all the users in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/stops'
    url = baseurl + api

    # res = requests.get(url)
    res = web_service_get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code in [400, 500]:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract users:
    #
    body = res.json()
    #
    # let's map each dictionary into a User object:
    #
    stops = []
    for row in body["data"]:
      stop = jsons.load(row, User)
      stops.append(stop)
    #
    # Now we can think OOP:
    #
    for stop in stops:
      print(stop.stopid)
      print(" ", stop.stopname)

  except Exception as e:
    logging.error("stops() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# assets
#
def images(baseurl):
  """
  Prints out all the assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/images'
    url = baseurl + api

    # res = requests.get(url)
    res = web_service_get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 500:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      elif res.status_code == 400:
        print("No such image...")
      #
      return

    #
    # deserialize and extract assets:
    #
    body = res.json()
    #
    # let's map each dictionary into an Asset object:
    #
    images = []
    for row in body["data"]:
      image = jsons.load(row, Image)
      images.append(image)
    #
    # Now we can think OOP:
    #
    for image in images:
      print(image.imageid)
      print(" ", image.stopid)
      print(" ", image.imagename)
      print(" ", image.bucketkey)

  except Exception as e:
    logging.error("images() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# download
#
def download(baseurl, display=False):
  """
  Prompts the user for an asset id, and downloads
  that asset (image) from the bucket. Displays the
  image after download if display param is True.
  
  Parameters
  ----------
  baseurl: baseurl for web service,
  display: optional param controlling display of image
  
  Returns
  -------
  nothing
  """

  try:
    print("Enter image id>")
    imageid = input()

    #
    # call the web service:
    #
    api = '/image'
    url = baseurl + api + '/' + imageid

    # res = requests.get(url)
    res = web_service_get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      if res.status_code == 400:
        print("no such asset...")
      elif res.status_code == 500:
        print("Failed with status code:", res.status_code)
        print("url: " + url)  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract image:
    #
    body = res.json()

    #
    # TODO:
    #

    #
    # Now we can think OOP:
    #

    stopid = body["stop_id"]
    imagename = body["image_name"]
    bucketkey = body["bucket_key"]
    bytes = body["data"]

    print("stopid:", stopid)
    print("asset name:", imagename)
    print("bucket key:", bucketkey)

    #
    # write the binary data to a file (as a
    # binary file, not a text file):
    #
    # 
    #

    outfile = open(imagename, "wb")
    outfile.write(base64.b64decode(bytes))

    print("Downloaded from S3 and saved as '", imagename, "'")

    #
    # display image if requested:
    #
    if display:
      print('Oops...')
      print('Docker is not setup to display images, see if you can open and view locally...')
      print('Oops...')
      # image = img.imread(assetname)
      # plt.imshow(image)
      # plt.show()

  except Exception as e:
    logging.error("download() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# bucket_contents
#
def bucket_contents(baseurl):
  """
  Prints out the contents of the S3 bucket
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/bucket'
    url = baseurl + api

    #
    # we have to loop since data is returned page
    # by page:
    #
    lastkey = ""
    
    while True:
      #
      # make a request...
      # check status code, if failed break out of loop
      # any data? if not, break out of loop
      # display data
      #
      
      #
      # try:

      # res = requests.get(url)
      res = web_service_get(url)

      #
      # let's look at what we got back:
      #
      if res.status_code != 200:
        # failed:
        print("Failed with status code:", res.status_code)
        print("url: " + url)
        if res.status_code in [400, 500]:  # we'll have an error message
          body = res.json()
          print("Error message:", body["message"])
        #
        return
        #

      body = res.json()
        #
        # let's map each dictionary into an Asset object:
        #
      buckets = []
      for row in body["data"]:
        bucket = jsons.load(row, BucketItem)
        buckets.append(bucket)
      #
      # Now we can think OOP:
      #
      for bucket in buckets:
        lastkey = bucket.Key
        print(bucket.Key)
        print(" ", bucket.LastModified)
        #print(" ", bucket.ETag)
        print(" ", bucket.Size)
        #print(" ", bucket.StorageClass)
      
      #
      # prompt...
      # if 'y' then continue, else break
      #
      if(len(buckets) < 12):
        break
      
      print("another page? [y/n]")
      answer = input()
      #
      if answer == 'y':
        # add parameter to url
        url = baseurl + api
        url += "?startafter=" + lastkey
        #
        continue
      else:
        break

  except Exception as e:
    logging.error("bucket_contents() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# add_user
#
def add_user(baseurl):
  """
  Prompts the user for the new user's email,
  last name, and first name, and then inserts
  this user into the database. But if the user's
  email already exists in the database, then we
  update the user's info instead of inserting
  a new user.
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    print("Enter user's email>")
    email = input()

    print("Enter user's last (family) name>")
    last_name = input()

    print("Enter user's first (given) name>")
    first_name = input()

    # generate unique folder name:
    folder = str(uuid.uuid4())

    #
    # build the data packet:
    #
    # TODO
    #
    data = {
      "email": email,
      "lastname": last_name,
      "firstname": first_name,
      "bucketfolder": folder
    }

    #
    # call the web service:
    #
    api = '/user'
    url = baseurl + api
    
    #
    # TODO
    #
    res = requests.put(url, json=data)
    #

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code in [400, 500]:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # success, extract userid:
    #
    body = res.json()

    userid = body["userid"]
    message = body["message"]

    print("User", userid, "successfully", message)

  except Exception as e:
    logging.error("add_user() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# upload
#
def upload(baseurl):
  """
  Prompts the user for a local filename and user id, 
  and uploads that asset (image) to the user's folder 
  in the bucket. The asset is given a random, unique 
  name. The database is also updated to record the 
  existence of this new asset in S3.
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    print("Enter local filename>")
    local_filename = input()

    if not pathlib.Path(local_filename).is_file():
      print("Local file '", local_filename, "' does not exist...")
      return

    print("Enter stop id>")
    stopid = input()

    #
    # build the data packet:
    #
    infile = open(local_filename, "rb")
    bytes = infile.read()
    infile.close()

    #
    # now encode the image as base64. Note b64encode returns
    # a bytes object, not a string. So then we have to convert
    # (decode) the bytes -> string, and then we can serialize
    # the string as JSON for upload to server:
    #
    data = base64.b64encode(bytes)
    datastr = data.decode()

    data = {"imagename": local_filename, "data": datastr}

    #
    # call the web service:
    #
    api = '/image'
    url = baseurl + api + "/" + stopid

    res = requests.post(url, json=data)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code in [400, 500]:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # success, extract imageid:
    #
    body = res.json()

    imageid = body["imageid"]

    print("Image uploaded, image id =", imageid)

  except Exception as e:
    logging.error("upload() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return

###################################################################
#
# travel
#
def travel(baseurl):
  """
  Prints out S3 and RDS info: bucket status, # of users and 
  assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    print("Enter starting stop id:")
    stopone = input()

    print("Are you transferring somewhere? (y/n)")
    transfer = input()
    if transfer == "y":
      print("Enter transfer stop id for train you are getting off of:")
      stoptwo = input()
      print("Enter transfer stop id for train you are getting on:")
      stopthree = input()
      print("Enter stopid of final destination:")
      stopfour = input()
    else:
      print("Enter stopid of final destination:")
      stoptwo = input()
    
    api = '/travel_time'
    url = baseurl + api + '/' + stopone + '/' + stoptwo

    if transfer == 'y':
      url += '?stopthree=' + stopthree + '&stopfour=' + stopfour

    # res = requests.get(url)
    res = web_service_get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code in [400, 500]:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract stats:
    #
    body = res.json()
    #
    print(body["data"])

  except Exception as e:
    logging.error("stats() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return

#########################################################################
# main
#
print('** Welcome to PhotoApp v2 **')
print()

# eliminate traceback so we just get error message:
sys.tracebacklimit = 0

#
# what config file should we use for this session?
#
config_file = 'photoapp-client-config.ini'

print("What config file to use for this session?")
print("Press ENTER to use default (photoapp-client-config.ini),")
print("otherwise enter name of config file>")
s = input()

if s == "":  # use default
  pass  # already set
else:
  config_file = s

#
# does config file exist?
#
if not pathlib.Path(config_file).is_file():
  print("**ERROR: config file '", config_file, "' does not exist, exiting")
  sys.exit(0)

#
# setup base URL to web service:
#
configur = ConfigParser()
configur.read(config_file)
baseurl = configur.get('client', 'webservice')

#
# make sure baseurl does not end with /, if so remove:
#
if len(baseurl) < 16:
  print("**ERROR**")
  print("**ERROR: baseurl '", baseurl, "' in .ini file is empty or not nearly long enough, please fix")
  sys.exit(0)

if baseurl.startswith('https'):
  print("**ERROR**")
  print("**ERROR: baseurl '", baseurl, "' in .ini file starts with https, which is not supported (use http)")
  sys.exit(0)

lastchar = baseurl[len(baseurl) - 1]
if lastchar == "/":
  baseurl = baseurl[:-1]

# print(baseurl)

#
# main processing loop:
#
cmd = prompt()

while cmd != 0:
  #
  if cmd == 1:
    stats(baseurl)
  elif cmd == 2:
    stops(baseurl)
  elif cmd == 3:
    images(baseurl)
  elif cmd == 4:
    download(baseurl)
  elif cmd == 5:
    upload(baseurl)
  elif cmd == 6:
    travel(baseurl)
  else:
    print("** Unknown command, try again...")
  #
  cmd = prompt()

#
# done
#
print()
print('** done **')